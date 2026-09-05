/** Educational geometry. This is not an MHD solution or a space-weather forecast. */
export type Vec3 = [number, number, number];
export type View = 'overview' | 'meridian' | 'ring' | 'aurora';
export interface Conditions {
  speed: number;
  density: number;
  bz: number;
}
export interface ModelState extends Conditions {
  playing: boolean;
  field: boolean;
  wind: boolean;
  currents: boolean;
  aurora: boolean;
  plasma: boolean;
  outflow: boolean;
}
export const DEFAULT_STATE: ModelState = {
  speed: 450,
  density: 5,
  bz: -5,
  playing: true,
  field: true,
  wind: true,
  currents: true,
  aurora: true,
  plasma: true,
  outflow: true,
};
export const STAGES = [
  {
    title: 'Dayside reconnection',
    short: 'Open',
    start: 0.04,
    description:
      'With southward IMF, oppositely directed fields reconnect on the dayside. A closed terrestrial field line becomes two open lines, each with one end anchored to Earth.',
  },
  {
    title: 'Open flux moves tailward',
    short: 'Transport',
    start: 0.3,
    description:
      'The solar wind carries open magnetic flux over the polar regions and into the tail lobes. The highlighted lines change shape as they convect; these are moving flux tubes, not particle trajectories.',
  },
  {
    title: 'Nightside reconnection',
    short: 'Reconnect',
    start: 0.54,
    description:
      'Oppositely directed lobe fields reconnect across the tail current sheet. This creates an Earth-connected closed line and a disconnected structure that moves down the tail.',
  },
  {
    title: 'Earthward return',
    short: 'Return',
    start: 0.69,
    description:
      'Newly closed flux moves Earthward and becomes more dipolar. Energy release can energize particles; some precipitate into the atmosphere and produce aurora.',
  },
  {
    title: 'Sunward convection',
    short: 'Close the cycle',
    start: 0.88,
    description:
      'Closed flux returns around the flanks toward the dayside. Both dawn and dusk return paths occur; one representative path is highlighted here.',
  },
] as const;
export function pressure({ speed, density }: Conditions): number {
  return 1.6726219e-6 * density * speed * speed;
}
export function standoff(c: Conditions): number {
  return 10 * Math.pow(2 / pressure(c), 1 / 6);
}
export function coupling(c: Conditions): number {
  return Math.min(1, ((Math.max(0, -c.bz) / 10) * c.speed) / 450);
}
export function stageAt(p: number): number {
  return p < 0.18 ? 0 : p < 0.46 ? 1 : p < 0.62 ? 2 : p < 0.8 ? 3 : 4;
}
export function advanceCycle(phase: number, dt: number, c: Conditions): number {
  // A northward turn stops new dayside opening; flux already in transit can finish.
  if (c.bz >= 0 && phase < 0.18) return 0;
  return (
    (phase +
      (Math.max(0, Math.min(dt, 0.1)) / 32) * (0.5 + 0.65 * coupling(c))) %
    1
  );
}
export function boundaryRadius(x: number, r0: number): number {
  if (x < -r0) return 0;
  return x <= 0
    ? Math.sqrt(Math.max(0, 2 * r0 * (x + r0)))
    : r0 * (Math.SQRT2 + 0.24 * (1 - Math.exp(-x / 18)));
}
export function dipoleLine(
  apex: number,
  azimuth: number,
  samples = 100,
): Vec3[] {
  const theta0 = Math.asin(1 / Math.sqrt(apex));
  return Array.from({ length: samples }, (_, i) => {
    const t = theta0 + ((Math.PI - 2 * theta0) * i) / (samples - 1),
      r = apex * Math.sin(t) ** 2;
    return [
      r * Math.sin(t) * Math.cos(azimuth),
      r * Math.cos(t),
      r * Math.sin(t) * Math.sin(azimuth),
    ];
  });
}
export function windPoint(
  t: number,
  impact: number,
  angle: number,
  r0: number,
): Vec3 {
  const x = -29 + t * 70;
  const outward = Math.max(impact, boundaryRadius(x + 3, r0) * 1.08 + 0.2);
  return [x, outward * Math.cos(angle), outward * Math.sin(angle)];
}
export function validConditions(input: unknown): Conditions {
  if (!input || typeof input !== 'object')
    throw new Error('Expected solar-wind conditions.');
  const p = input as Record<string, unknown>;
  for (const [key, min, max] of [
    ['speed', 300, 900],
    ['density', 1, 20],
    ['bz', -15, 15],
  ] as const) {
    if (
      typeof p[key] !== 'number' ||
      !Number.isFinite(p[key]) ||
      p[key] < min ||
      p[key] > max
    )
      throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return {
    speed: p.speed as number,
    density: p.density as number,
    bz: p.bz as number,
  };
}
export interface FluxLine {
  points: Vec3[];
  connection: 'closed' | 'open' | 'disconnected';
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
function bezier(a: Vec3, b: Vec3, c: Vec3, d: Vec3, n = 100): Vec3[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1),
      u = 1 - t;
    return a.map(
      (v, j) =>
        u * u * u * v +
        3 * u * u * t * b[j] +
        3 * u * t * t * c[j] +
        t * t * t * d[j],
    ) as Vec3;
  });
}
function anchors(sign: number, night = false): Vec3 {
  return [night ? 0.35 : -0.35, sign * Math.sqrt(1 - 0.35 * 0.35), 0];
}
export function cycleFlux(p: number, r0: number): FluxLine[] {
  if (p < 0.12)
    return [
      {
        points: dipoleLine(r0 * lerp(0.88, 1, p / 0.12), Math.PI),
        connection: 'closed',
      },
    ];
  if (p < 0.46) {
    const u = smooth(Math.max(0, (p - 0.18) / 0.28)),
      opening = Math.min(1, (p - 0.12) / 0.06);
    return [1, -1].map((sign) => ({
      connection: 'open' as const,
      points: bezier(
        [
          lerp(-0.35, 0.35, u),
          sign * Math.sqrt(1 - lerp(-0.35, 0.35, u) ** 2),
          0,
        ],
        [lerp(-r0, 8, u), sign * lerp(r0 * 0.65, 8, u), 0],
        [lerp(-r0, 25, u), sign * lerp(2, 12, u), 0],
        [lerp(-r0, 38, u), sign * lerp(18 * opening, 8, u), 0],
      ),
    }));
  }
  if (p < 0.54) {
    const gap = lerp(7, 0.05, smooth((p - 0.46) / 0.08));
    return [1, -1].map((sign) => ({
      connection: 'open' as const,
      points: [
        ...bezier(
          anchors(sign, true),
          [5, sign * 8, 0],
          [14, sign * 8, 0],
          [18, sign * gap, 0],
          60,
        ),
        ...bezier(
          [18, sign * gap, 0],
          [22, sign * gap, 0],
          [30, sign * 8, 0],
          [38, sign * 8, 0],
          40,
        ).slice(1),
      ],
    }));
  }
  if (p < 0.8) {
    const u = smooth(Math.max(0, (p - 0.62) / 0.18)),
      apex = lerp(18, 6, u);
    const lines: FluxLine[] = [
      { points: dipoleLine(apex, 0), connection: 'closed' },
    ];
    if (p < 0.69) {
      const center = 23 + (p - 0.54) * 95;
      lines.push({
        connection: 'disconnected',
        points: Array.from({ length: 100 }, (_, i) => {
          const a = (i / 99) * Math.PI * 2;
          return [center + 5 * Math.cos(a), 3 * Math.sin(a), 0];
        }),
      });
    }
    return lines;
  }
  return [
    {
      points: dipoleLine(
        lerp(6, 0.88 * r0, smooth((p - 0.8) / 0.2)),
        Math.PI * smooth((p - 0.8) / 0.2),
      ),
      connection: 'closed',
    },
  ];
}
/** Field-aligned thermal ion outflow, distinct from downward auroral precipitation. */
export function outflowPoint(t: number, seed: number, sign: number): Vec3 {
  const theta = ((7 + 10 * ((seed * 7) % 1)) * Math.PI) / 180,
    phi = seed * 2 * Math.PI;
  const fx = 1.04 * Math.sin(theta) * Math.cos(phi),
    fz = 1.04 * Math.sin(theta) * Math.sin(phi);
  return [
    fx * (1 + 3 * t) + 6.5 * t * t,
    sign * (1.04 * Math.cos(theta) + 7 * t),
    fz * (1 + 5 * t),
  ];
}
/** Representative bulk transport on either side of the schematic tail X-line at x=18. */
export function tailTransportPoint(
  t: number,
  seed: number,
  tailward: boolean,
): Vec3 {
  const flank = seed > 0.5 ? 1 : -1,
    z = flank * (0.4 + Math.abs(seed - 0.5) * 10),
    y = 0.55 * Math.sin(seed * 24.5);
  if (tailward) return [18.2 + 20 * t, y, z * (1 + 0.25 * t)];
  if (t < 0.68) {
    const u = t / 0.68;
    return [17.8 - 13.4 * u, y, z * (1 - 0.65 * u)];
  }
  const a = ((t - 0.68) / 0.32) * Math.PI,
    r = Math.sqrt(4.4 * 4.4 + (z * 0.35) ** 2);
  const initialAngle = Math.atan2(Math.abs(z * 0.35), 4.4),
    phi = initialAngle + a * (1 - initialAngle / Math.PI);
  return [r * Math.cos(phi), y, flank * r * Math.sin(phi)];
}
