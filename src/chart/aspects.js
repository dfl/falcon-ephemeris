// Aspect detection between chart points. Two modes: a fixed table of named aspects (default), or a
// harmonic sweep (harmonics 1..N with orb scaled by harmonic), inspired by astroscript. Whether an
// aspect is "applying" (tightening) or "separating" is read from the two points' longitudinal speeds.

const norm360 = x => ((x % 360) + 360) % 360;
// Signed shortest separation a->b in (-180, 180].
const arc = (a, b) => ((b - a) % 360 + 540) % 360 - 180;

// Default aspect set. `major` marks the Ptolemaic aspects; minors are off unless requested.
export const ASPECTS = [
  { key: 'conjunction',   angle: 0,   symbol: '☌', major: true,  defaultOrb: 8 },
  { key: 'opposition',    angle: 180, symbol: '☍', major: true,  defaultOrb: 8 },
  { key: 'trine',         angle: 120, symbol: '△', major: true,  defaultOrb: 7 },
  { key: 'square',        angle: 90,  symbol: '□', major: true,  defaultOrb: 7 },
  { key: 'sextile',       angle: 60,  symbol: '✶', major: true,  defaultOrb: 6 },
  { key: 'quincunx',      angle: 150, symbol: '⚻', major: false, defaultOrb: 3 },
  { key: 'semisextile',   angle: 30,  symbol: '⚺', major: false, defaultOrb: 2 },
  { key: 'semisquare',    angle: 45,  symbol: '∠', major: false, defaultOrb: 2 },
  { key: 'sesquiquadrate', angle: 135, symbol: '⚼', major: false, defaultOrb: 2 },
];

// Pairs of points that are inherently ~180° apart (two ends of one axis): the opposition between
// them is a geometric identity, not a real aspect, so it's suppressed unless `redundant: true`.
export const REDUNDANT_PAIRS = [
  ['northNode', 'southNode'], ['lilith', 'priapus'],
  ['ascendant', 'descendant'], ['midheaven', 'imumCoeli'], ['vertex', 'antivertex'],
];
const redundantKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const REDUNDANT = new Set(REDUNDANT_PAIRS.map(([a, b]) => redundantKey(a, b)));

// Reduced-ratio → name for harmonic aspects (numerator/denominator of the fraction of a full circle).
const HARMONIC_NAMES = {
  '1/1': 'conjunction', '1/2': 'opposition', '1/3': 'trine', '1/4': 'square', '1/6': 'sextile',
  '1/8': 'semisquare', '3/8': 'sesquiquadrate', '1/12': 'semisextile', '5/12': 'quincunx',
  '1/5': 'quintile', '2/5': 'biquintile', '1/7': 'septile', '2/7': 'biseptile', '3/7': 'triseptile',
  '1/9': 'novile', '2/9': 'binovile', '4/9': 'quadranovile', '1/10': 'decile', '3/10': 'tridecile',
  '1/11': 'undecile', '1/16': 'semisemisquare',
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function harmonicName(numerator, harmonic) {
  if (numerator === 0) return 'conjunction';
  const g = gcd(numerator, harmonic);
  const n = numerator / g, d = harmonic / g;
  return HARMONIC_NAMES[`${n}/${d}`] ?? `${n}/${d}`;
}

// Find aspects among `points` (an array of { key, longitude, speed? }). Options:
//   orbs      — per-aspect orb overrides for table mode, e.g. { trine: 6 }
//   minors    — include the non-Ptolemaic table aspects (default false)
//   maxOrb    — hard cap on the orb (table mode)
//   redundant — include the degenerate opposition between axis pairs (default false → suppressed)
//   harmonics — an array of harmonics (e.g. [1,2,3,4,6]) to sweep instead of the table; the tightest
//               matching harmonic per pair is returned
//   harmonicOrb — base orb for harmonic mode; the tolerance at harmonic h is harmonicOrb / h (default 8)
// Each result: { a, b, aspect, symbol?, angle, exactAngle, orb, applying|null } (+ harmonic/numerator
// in harmonic mode). `applying` is null when either point lacks a speed. Sorted tightest-orb first.
export function findAspects(points, { orbs = {}, minors = false, maxOrb = Infinity, redundant = false, harmonics = null, harmonicOrb = 8 } = {}) {
  const out = [];
  const suppressed = (a, b) => !redundant && REDUNDANT.has(redundantKey(a, b));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i], q = points[j];
      if (suppressed(p.key, q.key)) continue;
      const sep = Math.abs(arc(p.longitude, q.longitude)); // 0..180
      if (harmonics) {
        const hit = harmonicHit(sep, harmonics, harmonicOrb);
        if (hit) out.push({ a: p.key, b: q.key, ...hit, exactAngle: sep, applying: applyingFlag(p, q, hit.angle) });
      } else {
        for (const k of (minors ? ASPECTS : ASPECTS.filter(a => a.major))) {
          const orb = Math.min(orbs[k.key] ?? k.defaultOrb, maxOrb);
          const delta = Math.abs(sep - k.angle);
          if (delta > orb) continue;
          out.push({ a: p.key, b: q.key, aspect: k.key, symbol: k.symbol, angle: k.angle, exactAngle: sep, orb: delta, applying: applyingFlag(p, q, k.angle) });
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// Lowest-harmonic aspect matching a separation, or null. Tolerance at harmonic h is harmonicOrb/h.
function harmonicHit(sep, harmonics, harmonicOrb) {
  for (const h of [...harmonics].sort((a, b) => a - b)) {
    const step = 360 / h;
    const m = Math.round(sep / step);
    const angle = m * step;
    if (angle > 180.0001) continue;               // fold to 0..180
    const orb = Math.abs(sep - angle);
    if (orb > harmonicOrb / h) continue;
    const numerator = angle > 180 ? h - m : m;    // fold both sides of the axis onto one aspect
    return { aspect: harmonicName(numerator, h), harmonic: h, numerator, angle, orb };
  }
  return null;
}

// Applying if the pair's separation is heading toward the exact aspect angle; null without speeds.
function applyingFlag(p, q, angle) {
  if (p.speed == null || q.speed == null) return null;
  const dSep = q.speed - p.speed;
  const signed = arc(p.longitude, q.longitude);
  const offset = Math.abs(signed) - angle;
  const dAbsSep = Math.sign(signed || 1) * dSep;
  return Math.sign(offset) !== Math.sign(dAbsSep) && offset !== 0;
}
