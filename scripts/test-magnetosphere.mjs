import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STATE,
  pressure,
  standoff,
  cycleFlux,
  dipoleLine,
  windPoint,
  boundaryRadius,
  advanceCycle,
  stageAt,
  validConditions,
  outflowPoint,
  tailTransportPoint,
} from '../lib/magnetosphere.ts';
const norm = (point) => Math.hypot(...point);
test('Proton pressure uses density in cm^-3 and speed in km/s', () => {
  assert.ok(
    Math.abs(
      pressure({ ...DEFAULT_STATE, speed: 400, density: 5 }) - 1.33809752,
    ) < 1e-9,
  );
  const doubled = { ...DEFAULT_STATE, speed: 900 };
  assert.ok(Math.abs(pressure(doubled) / pressure(DEFAULT_STATE) - 4) < 1e-12);
  assert.ok(
    Math.abs(
      standoff(doubled) / standoff(DEFAULT_STATE) - Math.pow(4, -1 / 6),
    ) < 1e-12,
  );
});
test('A northward IMF stops fresh opening and allows existing flux to return', () => {
  const north = { ...DEFAULT_STATE, bz: 5 };
  assert.equal(advanceCycle(0.04, 0.1, north), 0);
  let phase = 0.3;
  for (let i = 0; i < 1000; i++) phase = advanceCycle(phase, 0.1, north);
  assert.equal(phase, 0);
  assert.ok(advanceCycle(0.04, 0.1, DEFAULT_STATE) > 0.04);
  assert.equal(advanceCycle(0.2, 0, DEFAULT_STATE), 0.2);
});
test('Dungey topology opens, reconnects, and returns closed flux to the dayside', () => {
  const r = standoff(DEFAULT_STATE);
  assert.deepEqual(
    cycleFlux(0.04, r).map((l) => l.connection),
    ['closed'],
  );
  assert.deepEqual(
    cycleFlux(0.3, r).map((l) => l.connection),
    ['open', 'open'],
  );
  assert.deepEqual(
    cycleFlux(0.53, r).map((l) => l.connection),
    ['open', 'open'],
  );
  assert.deepEqual(
    cycleFlux(0.55, r).map((l) => l.connection),
    ['closed', 'disconnected'],
  );
  assert.deepEqual(
    cycleFlux(0.75, r).map((l) => l.connection),
    ['closed'],
  );
  const first = cycleFlux(0, r)[0].points,
    last = cycleFlux(0.999999, r)[0].points;
  for (let i = 0; i < first.length; i++)
    assert.ok(Math.hypot(...first[i].map((a, k) => a - last[i][k])) < 0.001);
});
test('Earth-connected endpoints stay on the sphere and all geometry is finite across controls', () => {
  for (const speed of [300, 450, 900])
    for (const density of [1, 5, 20]) {
      const r = standoff({ ...DEFAULT_STATE, speed, density });
      for (let i = 0; i < 1000; i++)
        for (const f of cycleFlux(i / 1000, r)) {
          assert.ok(f.points.every((p) => p.every(Number.isFinite)));
          if (f.connection !== 'disconnected')
            assert.ok(Math.abs(norm(f.points[0]) - 1) < 1e-9);
          if (f.connection === 'closed')
            assert.ok(Math.abs(norm(f.points.at(-1)) - 1) < 1e-9);
        }
    }
  for (const L of [3, 5, 9, 18])
    assert.ok(dipoleLine(L, Math.PI / 2).every((p) => norm(p) >= 1 - 1e-9));
});
test('Solar-wind streamlines stay outside the magnetopause', () => {
  for (const speed of [300, 900])
    for (const density of [1, 20]) {
      const r = standoff({ ...DEFAULT_STATE, speed, density });
      for (let i = 0; i <= 200; i++)
        for (const impact of [1.4, 7, 20]) {
          const [x, y, z] = windPoint(i / 200, impact, 0.83, r);
          if (x >= -r) assert.ok(Math.hypot(y, z) >= boundaryRadius(x, r));
        }
    }
});
test('Invalid control input is rejected and stage boundaries are stable', () => {
  assert.deepEqual(validConditions(DEFAULT_STATE), {
    speed: 450,
    density: 5,
    bz: -5,
  });
  for (const patch of [
    { speed: NaN },
    { density: 0 },
    { bz: 16 },
    { bz: '-5' },
  ])
    assert.throws(() => validConditions({ ...DEFAULT_STATE, ...patch }));
  assert.deepEqual([0.04, 0.3, 0.54, 0.69, 0.88].map(stageAt), [0, 1, 2, 3, 4]);
});
test('Polar ion outflow starts above both polar caps and moves outward without entering Earth', () => {
  for (let j = 0; j < 100; j++)
    for (const sign of [-1, 1]) {
      const seed = j / 100,
        start = outflowPoint(0, seed, sign);
      assert.ok(Math.abs(norm(start) - 1.04) < 1e-12);
      assert.ok(
        Math.abs(start[1]) / norm(start) > Math.cos((18 * Math.PI) / 180),
      );
      let previous = norm(start);
      for (let i = 1; i <= 100; i++) {
        const p = outflowPoint(i / 100, seed, sign);
        assert.ok(p.every(Number.isFinite));
        assert.ok(norm(p) > previous);
        assert.ok(p[1] * sign > 0);
        previous = norm(p);
      }
    }
});
test('Tail flows diverge from the X-line, turn around the flanks, and stay outside Earth', () => {
  for (let j = 0; j < 100; j++) {
    const seed = j / 100;
    for (const tailward of [false, true])
      for (let i = 0; i <= 100; i++) {
        const t = i / 100,
          p = tailTransportPoint(t, seed, tailward);
        assert.ok(p.every(Number.isFinite));
        assert.ok(norm(p) > 4);
        if (i > 0) {
          const before = tailTransportPoint(t - 0.01, seed, tailward);
          assert.ok(tailward ? p[0] > before[0] : p[0] < before[0]);
        }
      }
    const left = tailTransportPoint(0.68 - 1e-8, seed, false),
      right = tailTransportPoint(0.68, seed, false);
    assert.ok(Math.hypot(...left.map((v, k) => v - right[k])) < 1e-5);
  }
});
