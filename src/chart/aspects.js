// Aspect detection between chart points. An aspect is a significant angular separation; whether it
// is "applying" (tightening) or "separating" (loosening) is read from the two points' longitudinal
// speeds, so callers that want that flag must supply speeds.

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

// Find all aspects among `points` (an array of { key, longitude, speed? }). Options:
//   orbs      — per-aspect orb overrides, e.g. { trine: 6 } (falls back to each aspect's defaultOrb)
//   minors    — include the non-Ptolemaic aspects (default false)
//   maxOrb    — hard cap applied on top of the per-aspect orb (optional)
// Each result: { a, b, aspect, symbol, angle, exactAngle, orb, applying|null }. `applying` is null
// when either point has no speed. Results are sorted tightest-orb first.
export function findAspects(points, { orbs = {}, minors = false, maxOrb = Infinity } = {}) {
  const kinds = ASPECTS.filter(a => minors || a.major);
  const out = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i], q = points[j];
      const sep = Math.abs(arc(p.longitude, q.longitude)); // 0..180
      for (const k of kinds) {
        const orb = Math.min(orbs[k.key] ?? k.defaultOrb, maxOrb);
        const delta = Math.abs(sep - k.angle);
        if (delta > orb) continue;
        out.push({
          a: p.key, b: q.key,
          aspect: k.key, symbol: k.symbol,
          angle: k.angle, exactAngle: sep, orb: delta,
          applying: applyingFlag(p, q, k.angle),
        });
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// Applying if the gap between the pair's actual separation and the exact aspect angle is shrinking.
// d(sep)/dt has the sign of (relative speed) times the sign of the current (sep - angle) offset;
// null when we lack a speed for either body.
function applyingFlag(p, q, angle) {
  if (p.speed == null || q.speed == null) return null;
  // Rate of change of the signed p->q separation.
  const dSep = q.speed - p.speed;
  const signed = arc(p.longitude, q.longitude);         // (-180,180]
  const offset = Math.abs(signed) - angle;              // how far past/short of exact
  // Moving the |separation| toward `angle` means |signed| is heading to `angle`.
  const dAbsSep = Math.sign(signed || 1) * dSep;
  return Math.sign(offset) !== Math.sign(dAbsSep) && offset !== 0;
}
