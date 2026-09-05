import { createPlasmaVolumes } from './plasma';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  advanceCycle,
  boundaryRadius,
  coupling,
  cycleFlux,
  dipoleLine,
  stageAt,
  standoff,
  windPoint,
  type ModelState,
  type Vec3,
  type View,
} from '@/lib/magnetosphere';

export interface MagnetosphereScene {
  update(s: ModelState): void;
  setView(v: View): void;
  zoom(f: number): void;
  seek(p: number): void;
  reset(s: ModelState): void;
  dispose(): void;
}
const v = (p: Vec3) => new THREE.Vector3(...p);
const color = {
  closed: 0x77acfa,
  flux: 0x70ffdb,
  wind: 0xffc477,
  current: 0xff77a9,
  aurora: 0x9cff7b,
};
export function createMagnetosphere(
  host: HTMLDivElement,
  initial: ModelState,
  onStage: (n: number) => void,
  onError: () => void,
): MagnetosphereScene {
  let contextAvailable = true;
  let state = { ...initial },
    phase = 0.04,
    time = 0,
    oldStage = 0,
    view: View = 'overview',
    disposed = false,
    visible = true,
    raf = 0,
    last = performance.now(),
    r0 = standoff(state),
    lastGeometry = -1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050f1b);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, host.clientWidth < 600 ? 1.25 : 1.5),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.08, 250);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  orbit.enablePan = false;
  orbit.minDistance = 3;
  orbit.maxDistance = 110;
  orbit.maxPolarAngle = Math.PI - 0.05;
  orbit.minPolarAngle = 0.05;
  // One-finger orbit and two-finger pinch are confined to the canvas.
  orbit.touches.ONE = THREE.TOUCH.ROTATE;
  orbit.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const layers = {
    field: new THREE.Group(),
    wind: new THREE.Group(),
    currents: new THREE.Group(),
    aurora: new THREE.Group(),
  };
  Object.values(layers).forEach((g) => scene.add(g));
  const shell = new THREE.Group(),
    cycle = new THREE.Group();
  scene.add(shell, cycle);
  const labelNodes: Array<{
    node: HTMLSpanElement;
    position: () => THREE.Vector3;
    kind: string;
  }> = [];
  const labelsHost = document.createElement('div');
  labelsHost.className = 'model-world-labels';
  labelsHost.setAttribute('aria-hidden', 'true');
  host.appendChild(labelsHost);
  function label(text: string, position: () => THREE.Vector3, kind = 'base') {
    const node = document.createElement('span');
    node.textContent = text;
    node.className = `world-label label-${kind}`;
    labelsHost.appendChild(node);
    labelNodes.push({ node, position, kind });
  }
  label('SOLAR WIND →', () => new THREE.Vector3(-23, -10, 0));
  label('Bow shock', () => new THREE.Vector3(-r0 - 3, 8, 0), 'boundary');
  label(
    'Magnetopause',
    () => new THREE.Vector3(-r0 * 0.35, boundaryRadius(-r0 * 0.35, r0) + 1, 0),
    'boundary',
  );
  label('Magnetotail', () => new THREE.Vector3(29, 13, 0));
  label(
    'Dayside reconnection',
    () => new THREE.Vector3(-r0, -2.4, 0),
    'reconnection',
  );
  label(
    'Tail reconnection',
    () => new THREE.Vector3(18, -3, 0),
    'reconnection',
  );
  label('Ring-current plasma', () => new THREE.Vector3(0, -2.4, 3.5), 'plasma');
  label(
    'Field-aligned currents',
    () => new THREE.Vector3(3, 5.2, 5),
    'current',
  );
  label(
    'Duskward tail current',
    () => new THREE.Vector3(20, -1.2, 8),
    'current',
  );
  label('Auroral oval', () => new THREE.Vector3(0.75, 1.35, 0), 'aurora');
  label('Polar wind ↑', () => new THREE.Vector3(2.2, 4.5, 0), 'outflow');
  label('Plasma sheet', () => new THREE.Vector3(26, 1.5, 5), 'plasma');
  label('Magnetic north', () => new THREE.Vector3(0, 1.8, 0), 'aurora');
  scene.add(new THREE.AmbientLight(0x9ebae6, 1.2));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.7);
  sunlight.position.set(-30, 5, 8);
  scene.add(sunlight);
  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x4c7c99,
    shininess: 12,
    emissive: 0x061420,
    emissiveIntensity: 0.3,
  });
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 40),
    earthMaterial,
  );
  scene.add(earth);
  let earthTexture: THREE.Texture | undefined;
  new THREE.TextureLoader().load(
    '/images/earth-day-nasa.jpg',
    (t) => {
      if (disposed) {
        t.dispose();
        return;
      }
      earthTexture = t;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      earthMaterial.map = t;
      earthMaterial.color.set(0xffffff);
      earthMaterial.needsUpdate = true;
    },
    undefined,
    () => {
      /* A shaded globe remains useful if the texture is unavailable. */
    },
  );
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 48, 32),
    new THREE.MeshBasicMaterial({
      color: 0x5296e0,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere);
  const equator = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 128 }, (_, i) =>
        v([
          1.012 * Math.cos((i / 128) * Math.PI * 2),
          0,
          1.012 * Math.sin((i / 128) * Math.PI * 2),
        ]),
      ),
    ),
    new THREE.LineBasicMaterial({
      color: 0xb4d2eb,
      transparent: true,
      opacity: 0.12,
    }),
  );
  scene.add(equator);
  function clear(group: THREE.Group) {
    group.traverse((o) => {
      if (
        o instanceof THREE.Mesh ||
        o instanceof THREE.Line ||
        o instanceof THREE.Points
      ) {
        o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
    group.clear();
  }
  function line(
    points: Vec3[],
    hex: number,
    opacity: number,
    group: THREE.Group,
  ) {
    const object = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points.map(v)),
      new THREE.LineBasicMaterial({
        color: hex,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    group.add(object);
    return object;
  }
  function curve(points: Vec3[], closed = false) {
    return new THREE.CatmullRomCurve3(points.map(v), closed, 'centripetal');
  }
  function curveLine(
    path: THREE.Curve<THREE.Vector3>,
    hex: number,
    opacity: number,
    group: THREE.Group,
  ) {
    return line(
      path.getPoints(130).map((p) => p.toArray() as Vec3),
      hex,
      opacity,
      group,
    );
  }
  const currentPaths: THREE.Curve<THREE.Vector3>[] = [];
  function buildStructure() {
    clear(shell);
    clear(layers.field);
    clear(layers.currents);
    currentPaths.length = 0;
    const profile = Array.from({ length: 90 }, (_, i) => {
      const x = -r0 + ((35 + r0) * i) / 89;
      return new THREE.Vector2(boundaryRadius(x, r0), x);
    });
    const mp = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 56),
      new THREE.MeshBasicMaterial({
        color: 0x729ee0,
        transparent: true,
        opacity: 0.036,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mp.rotation.z = -Math.PI / 2;
    shell.add(mp);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      line(
        profile.map((p) => [p.y, p.x * Math.cos(a), p.x * Math.sin(a)]),
        0x5c85b9,
        k % 2 === 0 ? 0.22 : 0.1,
        shell,
      );
    }
    const shockR = r0 + 2.5;
    for (const sign of [-1, 1])
      line(
        Array.from({ length: 80 }, (_, i) => {
          const x = -shockR + ((shockR + 12) * i) / 79;
          return [x, sign * boundaryRadius(x, shockR), 0];
        }),
        color.wind,
        0.3,
        shell,
      );
    for (let a = 0; a < 12; a++)
      for (const apex of [3, 5, 7, 9]) {
        const angle = (a / 12) * Math.PI * 2;
        const front = Math.cos(angle) < 0 ? Math.min(apex, r0 * 0.85) : apex;
        line(dipoleLine(front, angle), color.closed, 0.25, layers.field);
      }
    // Open tail-lobe field. One end is attached to Earth; the far end exits the domain.
    if (state.bz < 0)
      for (const sign of [1, -1])
        for (const offset of [-0.5, 0, 0.5]) {
          const path = curve([
            [0.2, sign * 0.98, offset * 0.1],
            [4, sign * 5, offset * 4],
            [13, sign * 9, offset * 12],
            [35, sign * 10, offset * 15],
          ]);
          curveLine(path, 0x729cc6, 0.2, layers.field);
        }
    const ring = curve(
      Array.from({ length: 40 }, (_, i) => [
        3.2 * Math.cos((i / 40) * Math.PI * 2),
        0,
        3.2 * Math.sin((i / 40) * Math.PI * 2),
      ]),
      true,
    );
    curveLine(ring, color.current, 0.7, layers.currents);
    currentPaths.push(ring);
    const ringBody = new THREE.Mesh(
      new THREE.TubeGeometry(ring, 120, 0.065, 7, true),
      new THREE.MeshBasicMaterial({
        color: color.current,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    layers.currents.add(ringBody);
    // Duskward current in the central sheet, with schematic return paths on both lobes.
    for (const x of [10, 16, 23, 30])
      for (const sign of [1, -1]) {
        const width = boundaryRadius(x, r0) * 0.85;
        const points: Vec3[] = [
          [x, 0, -width],
          [x, 0, 0],
          [x, 0, width],
        ];
        for (let i = 1; i <= 20; i++) {
          const a = (i / 20) * Math.PI;
          points.push([x, sign * width * Math.sin(a), width * Math.cos(a)]);
        }
        const path = curve(points, true);
        curveLine(path, color.current, 0.16, layers.currents);
        currentPaths.push(path);
      }
    // A schematic Region-1 circuit: dawn downward, dusk upward, ionospheric closure.
    for (const sign of [1, -1]) {
      const points: Vec3[] = [
        [4, sign * 5, -6],
        [1.1, sign * 2.8, -2.3],
        [-0.1, sign * 0.98, -0.34],
        [-0.28, sign * 1.0, 0],
        [-0.1, sign * 0.98, 0.34],
        [1.1, sign * 2.8, 2.3],
        [4, sign * 5, 6],
        [7, sign * 7, 0],
      ];
      const path = curve(points, true);
      curveLine(path, color.current, 0.65, layers.currents);
      currentPaths.push(path);
      layers.currents.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(path, 160, 0.055, 6, true),
          new THREE.MeshBasicMaterial({
            color: color.current,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
          }),
        ),
      );
    }
    for (const [index, path] of currentPaths.entries()) {
      for (const t of [0.14, 0.65]) {
        const arrow = new THREE.ArrowHelper(
          path.getTangentAt(t),
          path.getPointAt(t),
          index === 0 ? 0.65 : 0.85,
          color.current,
          0.25,
          0.13,
        );
        layers.currents.add(arrow);
      }
    }
  }
  buildStructure();
  const plasma = createPlasmaVolumes(scene);
  const windCount = 440,
    windPositions = new Float32Array(windCount * 3),
    windGeometry = new THREE.BufferGeometry();
  windGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(windPositions, 3),
  );
  const windMaterial = new THREE.PointsMaterial({
    color: color.wind,
    size: 0.12,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const windPoints = new THREE.Points(windGeometry, windMaterial);
  windPoints.frustumCulled = false;
  layers.wind.add(windPoints);
  const windTrailPositions = new Float32Array(windCount * 6),
    windTrailGeometry = new THREE.BufferGeometry();
  windTrailGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(windTrailPositions, 3),
  );
  const windTrails = new THREE.LineSegments(
    windTrailGeometry,
    new THREE.LineBasicMaterial({
      color: color.wind,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  windTrails.frustumCulled = false;
  layers.wind.add(windTrails);
  const imf = new THREE.Group();
  layers.wind.add(imf);
  function buildImf() {
    clear(imf);
    const sign = state.bz < 0 ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      const x = -26 + i * 2;
      line(
        [
          [x, -10, -4],
          [x, 10, -4],
        ],
        0xffcc9c,
        0.27,
        imf,
      );
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, sign, 0),
        new THREE.Vector3(x, -sign * 2, -4),
        4,
        0xffcc9c,
        1,
        0.38,
      );
      imf.add(arrow);
    }
  }
  buildImf();
  const currentGeometry = new THREE.BufferGeometry(),
    currentPositions = new Float32Array(80 * 3);
  currentGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(currentPositions, 3),
  );
  const currentMarkers = new THREE.Points(
    currentGeometry,
    new THREE.PointsMaterial({
      color: 0xff9abe,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  currentMarkers.frustumCulled = false;
  scene.add(currentMarkers);
  const auroraGeometry = new THREE.BufferGeometry(),
    auroraPositions = new Float32Array(2 * 129 * 7 * 3),
    auroraColors = new Float32Array(auroraPositions.length),
    auroraIndices: number[] = [];
  for (let hemi = 0; hemi < 2; hemi++)
    for (let a = 0; a < 128; a++)
      for (let h = 0; h < 6; h++) {
        const k = hemi * 129 * 7 + a * 7 + h;
        auroraIndices.push(k, k + 7, k + 1, k + 1, k + 7, k + 8);
      }
  auroraGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(auroraPositions, 3),
  );
  auroraGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(auroraColors, 3),
  );
  auroraGeometry.setIndex(auroraIndices);
  const auroraMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const auroraCurtains = new THREE.Mesh(auroraGeometry, auroraMaterial);
  auroraCurtains.frustumCulled = false;
  layers.aurora.add(auroraCurtains);
  const precipitationGeometry = new THREE.BufferGeometry(),
    precipitationPositions = new Float32Array(60 * 3);
  precipitationGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(precipitationPositions, 3),
  );
  layers.aurora.add(
    new THREE.Points(
      precipitationGeometry,
      new THREE.PointsMaterial({
        color: color.aurora,
        size: 0.035,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  const cycleLines = Array.from({ length: 3 }, () => {
    const object = line(
      Array.from({ length: 120 }, () => [0, 0, 0]),
      color.flux,
      1,
      cycle,
    );
    object.frustumCulled = false;
    return object;
  });
  const highlightGlow = new THREE.PointLight(color.flux, 1.5, 5);
  scene.add(highlightGlow);
  const reconnectionMarkers = [-r0, 18].map((x) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xd0fff3,
        transparent: true,
        opacity: 0.85,
      }),
    );
    m.position.set(x, 0, 0);
    scene.add(m);
    return m;
  });
  function setView(next: View) {
    view = next;
    const aspect = Math.max(
      0.6,
      host.clientWidth / Math.max(1, host.clientHeight),
    );
    if (next === 'ring') {
      orbit.target.set(0, 0, 0);
      camera.position.set(-7, 9, 13);
    } else if (next === 'aurora') {
      orbit.target.set(0, 0, 0);
      camera.position.set(-1.8, 3.3, 3.3);
    } else {
      orbit.target.set(6, 0, 0);
      const distance = Math.max(51, 62 / aspect);
      camera.position.set(
        next === 'meridian' ? 6 : 11,
        next === 'meridian' ? 0 : distance * 0.27,
        distance,
      );
    }
    orbit.update();
  }
  function zoom(f: number) {
    const offset = camera.position.clone().sub(orbit.target).multiplyScalar(f);
    offset.clampLength(orbit.minDistance, orbit.maxDistance);
    camera.position.copy(orbit.target).add(offset);
    orbit.update();
  }
  function resize() {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  setView('overview');
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
  });
  io.observe(host);
  function contextLost(event: Event) {
    event.preventDefault();
    contextAvailable = false;
    onError();
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const keydown = (e: KeyboardEvent) => {
    if (e.target !== host) return;
    let handled = true;
    const offset = camera.position.clone().sub(orbit.target),
      spherical = new THREE.Spherical().setFromVector3(offset);
    if (e.key === 'ArrowLeft') spherical.theta -= 0.12;
    else if (e.key === 'ArrowRight') spherical.theta += 0.12;
    else if (e.key === 'ArrowUp')
      spherical.phi = Math.max(0.05, spherical.phi - 0.12);
    else if (e.key === 'ArrowDown')
      spherical.phi = Math.min(Math.PI - 0.05, spherical.phi + 0.12);
    else if (e.key === '+' || e.key === '=') {
      zoom(0.85);
      e.preventDefault();
      return;
    } else if (e.key === '-') {
      zoom(1.18);
      e.preventDefault();
      return;
    } else handled = false;
    if (handled) {
      e.preventDefault();
      camera.position
        .copy(orbit.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      orbit.update();
    }
  };
  host.addEventListener('keydown', keydown);
  function update(next: ModelState) {
    const rebuild =
      next.speed !== state.speed ||
      next.density !== state.density ||
      next.bz < 0 !== state.bz < 0;
    state = { ...next };
    r0 = standoff(state);
    if (rebuild) {
      buildStructure();
      buildImf();
    }
    lastGeometry = -1;
  }
  function seek(p: number) {
    phase = p;
    lastGeometry = -1;
    oldStage = stageAt(phase);
    onStage(oldStage);
  }
  const sampled = new THREE.Vector3();
  function draw(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(draw);
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden || !contextAvailable) return;
    if (state.playing) {
      time += dt;
      phase = advanceCycle(phase, dt, state);
    }
    const stage = stageAt(phase);
    if (stage !== oldStage) {
      oldStage = stage;
      onStage(stage);
    }
    const strength = coupling(state),
      burst = stage === 2 || stage === 3 ? 1 : 0.45;
    Object.entries(layers).forEach(
      ([key, g]) => (g.visible = state[key as keyof ModelState] as boolean),
    );
    cycle.visible = state.field;
    currentMarkers.visible = state.currents;
    for (let i = 0; i < windCount; i++) {
      const stream = i % 55,
        impact = 1.4 + (stream % 11) * 1.8,
        angle = stream * 2.39996,
        t = (i / 55 / 8 + time * 0.045 * (state.speed / 450)) % 1;
      const p = windPoint(t, impact, angle, r0);
      windPositions.set(p, i * 3);
      windTrailPositions.set(p, i * 6);
      windTrailPositions.set(
        windPoint(Math.max(0, t - 0.009), impact, angle, r0),
        i * 6 + 3,
      );
    }
    windGeometry.attributes.position.needsUpdate = true;
    windTrailGeometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < 80; i++) {
      const path = currentPaths[i % currentPaths.length];
      path.getPointAt(
        (i / 80 + time * (0.022 + 0.018 * strength)) % 1,
        sampled,
      );
      currentPositions.set(sampled.toArray(), i * 3);
    }
    currentGeometry.attributes.position.needsUpdate = true;
    earth.rotation.y = time * 0.018;
    plasma.update(state, time, stage);
    // Low aurora persists in this illustration; the brightness is not a physical prediction.
    for (let hemi = 0; hemi < 2; hemi++)
      for (let a = 0; a <= 128; a++)
        for (let h = 0; h < 7; h++) {
          const phi = (a / 128) * Math.PI * 2,
            up = h / 6,
            sign = hemi === 0 ? 1 : -1,
            theta =
              ((20 + strength * 6) * Math.PI) / 180 +
              0.012 * Math.sin(phi * 11 + time * 0.7);
          const r =
              1.035 +
              up *
                (0.1 + 0.3 * strength) *
                (0.8 + 0.2 * Math.sin(phi * 18 - time * 1.2)),
            index = (hemi * 129 * 7 + a * 7 + h) * 3;
          auroraPositions.set(
            [
              r * Math.sin(theta) * Math.cos(phi),
              sign * r * Math.cos(theta),
              r * Math.sin(theta) * Math.sin(phi),
            ],
            index,
          );
          const bright =
            (0.2 + 0.8 * strength) *
            (0.55 + 0.45 * Math.max(0, Math.cos(phi))) *
            (0.75 + 0.25 * burst) *
            (0.75 + 0.25 * Math.sin(phi * 25 + time));
          auroraColors.set(
            [
              bright * (up > 0.65 ? 0.65 : 0.18),
              bright * (1 - up * 0.6),
              bright * (0.3 + up * 0.55),
            ],
            index,
          );
        }
    auroraGeometry.attributes.position.needsUpdate = true;
    auroraGeometry.attributes.color.needsUpdate = true;
    for (let i = 0; i < 60; i++) {
      const sign = i % 2 === 0 ? 1 : -1,
        a = i * 2.39996,
        q = 1 - ((i / 60 + time * (0.14 + 0.14 * strength)) % 1),
        theta = ((20 + strength * 6) * Math.PI) / 180 + 0.13 * q,
        r =
          Math.sin(theta) ** 2 /
          Math.sin(((20 + strength * 6) * Math.PI) / 180) ** 2;
      precipitationPositions.set(
        [
          r * Math.sin(theta) * Math.cos(a),
          sign * r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(a),
        ],
        i * 3,
      );
    }
    precipitationGeometry.attributes.position.needsUpdate = true;
    if (lastGeometry < 0 || now - lastGeometry > 50) {
      const flux = cycleFlux(phase, r0);
      cycleLines.forEach((object, index) => {
        const f = flux[index];
        object.visible = !!f;
        if (!f) return;
        const path = curve(f.points),
          positions = object.geometry.attributes
            .position as THREE.BufferAttribute;
        for (let i = 0; i < 120; i++) {
          path.getPoint(i / 119, sampled);
          positions.setXYZ(i, sampled.x, sampled.y, sampled.z);
        }
        positions.needsUpdate = true;
      });
      lastGeometry = now;
    }
    reconnectionMarkers[0].position.x = -r0;
    reconnectionMarkers[0].visible = state.field && state.bz < 0;
    reconnectionMarkers[1].visible = state.field;
    reconnectionMarkers.forEach((m, i) =>
      m.scale.setScalar(
        (stage === (i === 0 ? 0 : 2) ? 1.8 : 1) *
          (0.9 + 0.1 * Math.sin(time * 5)),
      ),
    );
    highlightGlow.position.set(stage < 2 ? -r0 : 18, 0, 0);
    highlightGlow.visible = state.field && state.bz < 0;
    orbit.update();
    for (const { node, position, kind } of labelNodes) {
      const p = position().project(camera);
      const show =
        p.z > -1 &&
        p.z < 1 &&
        Math.abs(p.x) < 0.91 &&
        Math.abs(p.y) < 0.92 &&
        (view === 'aurora'
          ? kind === 'aurora' || kind === 'outflow'
          : kind !== 'aurora') &&
        (kind !== 'current' || state.currents) &&
        (kind !== 'plasma' || state.plasma) &&
        (kind !== 'outflow' || state.outflow) &&
        (kind !== 'reconnection' || (state.field && state.bz < 0));
      node.hidden = !show;
      if (show) {
        node.style.left = `${(p.x * 0.5 + 0.5) * 100}%`;
        node.style.top = `${(-p.y * 0.5 + 0.5) * 100}%`;
      }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(draw);
  return {
    update,
    setView,
    zoom,
    seek,
    reset(next) {
      update(next);
      seek(0.04);
      time = 0;
      setView('overview');
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener('keydown', keydown);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      orbit.dispose();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Line ||
          o instanceof THREE.Points
        ) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      earthTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelsHost.remove();
    },
  };
}
