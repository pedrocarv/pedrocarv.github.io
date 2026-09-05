'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_STATE,
  STAGES,
  pressure,
  standoff,
  type ModelState,
  type View,
} from '@/lib/magnetosphere';
import type { MagnetosphereScene } from './scene';

export default function MagnetosphereExplorer() {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<MagnetosphereScene | null>(null),
    stateRef = useRef<ModelState>(DEFAULT_STATE);
  const pendingPhase = useRef<number | undefined>(undefined),
    viewRef = useRef<View>('overview');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(DEFAULT_STATE),
    [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'),
    [stage, setStage] = useState(0),
    [view, setView] = useState<View>('overview');
  stateRef.current = state;
  viewRef.current = view;
  useEffect(() => {
    let disposed = false;
    setStatus('loading');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) setState((s) => ({ ...s, playing: false }));
    const element = host.current;
    if (!element) return;
    let requested = false;
    const start = () => {
      if (requested) return;
      requested = true;
      void import('./scene')
        .then(({ createMagnetosphere }) => {
          if (disposed) return;
          scene.current = createMagnetosphere(
            element,
            stateRef.current,
            setStage,
            () => setStatus('error'),
          );
          scene.current.setView(viewRef.current);
          if (pendingPhase.current !== undefined)
            scene.current.seek(pendingPhase.current);
          setStatus('ready');
        })
        .catch(() => {
          if (!disposed) setStatus('error');
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      scene.current?.dispose();
      scene.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    scene.current?.update(state);
  }, [state]);
  const change = (patch: Partial<ModelState>) =>
    setState((s) => ({ ...s, ...patch }));
  const camera = (next: View) => {
    setView(next);
    scene.current?.setView(next);
  };
  const reset = () => {
    const next = {
      ...DEFAULT_STATE,
      playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    setState(next);
    setView('overview');
    setStage(0);
    pendingPhase.current = 0.04;
    scene.current?.reset(next);
  };
  return (
    <section
      id="magnetosphere"
      className="magnetosphere-section"
      aria-labelledby="magnetosphere-title"
    >
      <div className="model-heading">
        <div>
          <p className="eyebrow">Explore / Interactive 3D</p>
          <h2 id="magnetosphere-title">
            A magnetosphere <em>in motion.</em>
          </h2>
        </div>
        <p>
          Change the solar wind. Follow a field line.
          <br />
          Explore how Earth connects to space.
        </p>
      </div>
      <div className="model-workspace">
        <div className="model-visual">
          <div className="model-toolbar">
            <div role="group" aria-label="Camera views">
              {(['overview', 'meridian', 'ring', 'aurora'] as const).map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => camera(v)}
                    aria-pressed={view === v}
                  >
                    {v === 'meridian'
                      ? 'Side view'
                      : v === 'ring'
                        ? 'Ring current'
                        : v === 'aurora'
                          ? 'Aurora'
                          : 'Overview'}
                  </button>
                ),
              )}
            </div>
            <div>
              <button
                onClick={() => change({ playing: !state.playing })}
                aria-label={
                  state.playing ? 'Pause animation' : 'Play animation'
                }
              >
                {state.playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={reset} aria-label="Reset model and camera">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          <div
            className="model-canvas"
            ref={host}
            tabIndex={0}
            role="img"
            aria-label="Rotatable magnetosphere. Drag to rotate; pinch or use zoom buttons. Arrow keys rotate; plus and minus zoom."
          />
          {status !== 'ready' && (
            <div className="model-fallback">
              <img
                src="/images/magnetosphere.webp"
                width="1200"
                height="1122"
                alt="Illustration of Earth's magnetosphere deflecting the solar wind"
              />
              <p role="status">
                {status === 'error'
                  ? 'The 3D view could not start. It needs WebGL 2 and hardware acceleration. You can still explore the cycle descriptions below.'
                  : 'Preparing the 3D magnetosphere…'}
              </p>
              {status === 'error' && (
                <button onClick={() => setAttempt((a) => a + 1)}>
                  Try the 3D view again
                </button>
              )}
            </div>
          )}
          <div className="model-bottom">
            <span>Drag to rotate · Pinch to zoom</span>
            <div>
              <button
                onClick={() => scene.current?.zoom(0.8)}
                aria-label="Zoom in"
              >
                <ZoomIn size={17} />
              </button>
              <button
                onClick={() => scene.current?.zoom(1.25)}
                aria-label="Zoom out"
              >
                <ZoomOut size={17} />
              </button>
            </div>
          </div>
          <div className="model-legend">
            <span>
              <i style={{ background: '#8bbcff' }} />
              Closed field
            </span>
            <span>
              <i style={{ background: '#6affdb' }} />
              Cycling flux
            </span>
            <span>
              <i style={{ background: '#ffc06f' }} />
              Solar wind
            </span>
            <span>
              <i style={{ background: '#ff7eae' }} />
              Currents
            </span>
            <span>
              <i style={{ background: '#97ff82' }} />
              Aurora
            </span>
            <span>
              <i style={{ background: '#9df4ff' }} />
              Polar outflow
            </span>
          </div>
        </div>
        <aside className="model-controls" aria-label="Magnetosphere controls">
          <p className="eyebrow">Upstream conditions</p>
          <div className="model-input">
            <div>
              <label id="speed-label">Solar-wind speed</label>
              <output>
                {state.speed} <small>km/s</small>
              </output>
            </div>
            <Slider
              aria-labelledby="speed-label"
              value={[state.speed]}
              onValueChange={(v) =>
                change({ speed: Array.isArray(v) ? v[0] : v })
              }
              min={300}
              max={900}
              step={25}
            />
          </div>
          <div className="model-input">
            <div>
              <label id="density-label">Proton density</label>
              <output>
                {state.density} <small>cm⁻³</small>
              </output>
            </div>
            <Slider
              aria-labelledby="density-label"
              value={[state.density]}
              onValueChange={(v) =>
                change({ density: Array.isArray(v) ? v[0] : v })
              }
              min={1}
              max={20}
              step={1}
            />
          </div>
          <div className="model-input">
            <div>
              <label id="bz-label">
                IMF B<sub>z</sub>
              </label>
              <output>
                {state.bz > 0 ? '+' : ''}
                {state.bz} <small>nT</small>
              </output>
            </div>
            <Slider
              aria-labelledby="bz-label"
              value={[state.bz]}
              onValueChange={(v) => change({ bz: Array.isArray(v) ? v[0] : v })}
              min={-15}
              max={15}
              step={1}
            />
            <div className="slider-endpoints">
              <span>Southward</span>
              <span>Northward</span>
            </div>
          </div>
          <div className="model-response">
            <strong>
              {state.bz < 0 ? 'Southward IMF' : 'Northward / zero IMF'}
            </strong>
            <p>
              {state.bz < 0
                ? 'Dayside opening drives the illustrated cycle.'
                : 'New dayside opening is suppressed. Flux already in transit completes its return; high-latitude reconnection is not shown.'}
            </p>
            <dl>
              <div>
                <dt>Dynamic pressure</dt>
                <dd>{pressure(state).toFixed(2)} nPa</dd>
              </div>
              <div>
                <dt>Dayside distance ≈</dt>
                <dd>
                  {standoff(state).toFixed(1)} R<sub>E</sub>
                </dd>
              </div>
            </dl>
          </div>
          <fieldset className="model-layers">
            <legend>Visible layers</legend>
            {(
              [
                { key: 'wind', label: 'Solar wind' },
                { key: 'field', label: 'Magnetic field' },
                { key: 'plasma', label: 'Plasma pressure volumes' },
                { key: 'currents', label: 'Current direction' },
                { key: 'outflow', label: 'Polar wind outflow' },
                { key: 'aurora', label: 'Aurora & precipitation' },
              ] as const
            ).map(({ key, label }) => (
              <label key={key}>
                <span>{label}</span>
                <Switch
                  checked={state[key]}
                  onCheckedChange={(checked) => change({ [key]: checked })}
                  aria-label={label}
                />
              </label>
            ))}
          </fieldset>
        </aside>
      </div>
      <div className="plasma-scale">
        <span>Plasma volumes · illustrative pressure</span>
        <i aria-hidden="true" />
        <span>Lower → Higher</span>
        <small>
          Colors are schematic, not measured values. Cyan plumes show polar ion
          outflow.
        </small>
      </div>
      <div className="cycle-story">
        <div className="cycle-heading">
          <p className="eyebrow">The Dungey cycle</p>
          <span>Select a stage to pause and inspect</span>
        </div>
        <div
          className="cycle-stages"
          role="group"
          aria-label="Dungey cycle stages"
        >
          {STAGES.map((item, i) => (
            <button
              key={item.short}
              aria-pressed={stage === i}
              onClick={() => {
                pendingPhase.current = item.start;
                setStage(i);
                change({ playing: false, bz: state.bz >= 0 ? -5 : state.bz });
                scene.current?.seek(item.start);
              }}
            >
              <span>0{i + 1}</span>
              {item.short}
            </button>
          ))}
        </div>
        <div
          className="cycle-description"
          aria-live={state.playing ? 'off' : 'polite'}
        >
          <h3>{STAGES[stage].title}</h3>
          <p>{STAGES[stage].description}</p>
        </div>
      </div>
      <details className="model-notes">
        <summary>About the model &amp; the physics</summary>
        <div>
          <p>
            This is a kinematic teaching model, not a numerical MHD solution or
            a forecast. Magnetic field lines show topology; moving pink markers
            show conventional current direction, while green particles represent
            auroral precipitation. The diffuse torus and plasma sheet use
            illustrative relative-pressure shading; amber markers trace drift
            and bulk plasma transport. Cyan plumes and upward-moving tracers
            represent thermal polar ion outflow, not auroral precipitation.
            Polar wind continues under northward IMF. Field-line motion, plasma
            flow, and electrical current are different quantities.
          </p>
          <p>
            The dayside distance uses proton dynamic pressure P = mₚnv² and a
            dipole pressure-balance scaling of 10 R<sub>E</sub> at 2 nPa
            (distance ∝ P<sup>−1/6</sup>). The remaining geometry is schematic.
            The tail is truncated; auroral altitude and current thickness are
            enlarged for visibility. Pressure volumes, transport speeds,
            animation time, and auroral brightness are illustrative. The
            asymmetric ring-current plasma volume is inspired by high-pressure
            regions in simulation visualizations; it is not a fitted HEIDI
            distribution. IMF B<sub>y</sub>, dipole tilt, northward-IMF lobe
            reconnection, Region 2 currents, and substorm timing are omitted.
          </p>
          <p>
            Visualization references:{' '}
            <a href="https://svs.gsfc.nasa.gov/5643/">
              NASA: ring-current pressure volume
            </a>{' '}
            ·{' '}
            <a href="https://svs.gsfc.nasa.gov/4088/">
              NASA: magnetotail fields and flow
            </a>{' '}
            · <a href="https://svs.gsfc.nasa.gov/14628/">NASA: polar wind</a>.
            Physics:{' '}
            <a href="https://pwg.gsfc.nasa.gov/Education/wmpause.html">
              NASA: reconnection and the Dungey cycle
            </a>{' '}
            ·{' '}
            <a href="https://pwg.gsfc.nasa.gov/Education/wcurrent.html">
              NASA: current systems
            </a>
            . Earth texture: NASA Earth Observatory.
          </p>
        </div>
      </details>
    </section>
  );
}
