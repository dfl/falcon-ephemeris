// Midpoints and midpoint pictures (cosmobiology / Uranian), inspired by astroscript. A midpoint is
// the point halfway between two bodies on the ecliptic; a midpoint "picture" (written apex = a/b) is
// a third point that sits on that midpoint on a modulus dial — the workhorse of Ebertin-style
// analysis. All longitudes in degrees.

const norm360 = x => ((x % 360) + 360) % 360;
// Signed shortest arc a→b in (-180, 180].
const arc = (a, b) => ((b - a) % 360 + 540) % 360 - 180;

// The (direct) midpoint of two ecliptic longitudes: the one on the short arc between them. Its
// opposite (this + 180) is the indirect midpoint; a 90°/180° dial treats them as equivalent.
export function midpoint(a, b) { return norm360(a + arc(a, b) / 2); }

// Distance of `lon` from `target` reduced onto a modulus dial (e.g. 90 → conjunction, square and
// opposition all collapse to 0). Returns 0 .. modulus/2.
function dialDistance(lon, target, modulus) {
  const d = norm360(lon - target) % modulus;
  return Math.min(d, modulus - d);
}

// Which hard aspect a raw separation represents, for labelling a picture.
function hardAspect(sep) {
  const s = Math.abs(((sep % 360) + 360) % 360);
  const a = s > 180 ? 360 - s : s;                 // 0..180
  return a < 45 ? 'conjunction' : a > 135 ? 'opposition' : 'square';
}

// All pairwise midpoints of `points` ([{ key, longitude }]). Returns [{ a, b, longitude }].
export function midpoints(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      out.push({ a: points[i].key, b: points[j].key, longitude: midpoint(points[i].longitude, points[j].longitude) });
    }
  }
  return out;
}

// Midpoint pictures (apex = a/b): every point whose longitude sits within `orb` of a pair's midpoint
// on a modulus dial. Default modulus 90 is the cosmobiology hard-aspect dial (conjunction, square and
// opposition all count); 45 adds the semisquare octave; 180 = conjunction/opposition only; 360 =
// direct conjunction only. The apex is never one of the pair. Returns tightest-orb first:
//   { apex, a, b, aspect, longitude, orb }   where `longitude` is the direct midpoint.
export function midpointPictures(points, { orb = 1.5, modulus = 90 } = {}) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i], p2 = points[j];
      const mid = midpoint(p1.longitude, p2.longitude);
      for (const apex of points) {
        if (apex.key === p1.key || apex.key === p2.key) continue;
        const d = dialDistance(apex.longitude, mid, modulus);
        if (d <= orb) {
          out.push({ apex: apex.key, a: p1.key, b: p2.key, aspect: hardAspect(apex.longitude - mid), longitude: mid, orb: d });
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}
