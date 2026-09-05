// House systems. Pure functions of the chart's
// angles/sidereal time, so they are unit-testable in isolation. All inputs and outputs are degrees.
//
//   armc   - right ascension of the MC (local sidereal time), degrees
//   asc    - ecliptic longitude of the Ascendant
//   mc     - ecliptic longitude of the Midheaven
//   lat    - geographic latitude
//   eps    - obliquity of the ecliptic
//
// Each function returns 12 ecliptic longitudes [cusp1 .. cusp12] (tropical).

const D = Math.PI / 180;
const sind = x => Math.sin(x * D), cosd = x => Math.cos(x * D), tand = x => Math.tan(x * D);
const asind = x => Math.asin(x) / D, acosd = x => Math.acos(x) / D, atand = x => Math.atan(x) / D;
const atan2d = (y, x) => Math.atan2(y, x) / D;
const norm = x => ((x % 360) + 360) % 360;

// Ecliptic longitude where the meridian of right ascension `ra` (a great circle through the celestial
// poles) crosses the ecliptic. Used by Meridian, Alcabitius, and the equinox handling.
const raMeridianToEcliptic = (ra, eps) => norm(atan2d(sind(ra), cosd(ra) * cosd(eps)));
// Ecliptic longitude of the equatorial point (ra, dec=0). Used by Morinus.
const equatorPointToEcliptic = (ra, eps) => norm(atan2d(sind(ra) * cosd(eps), cosd(ra)));

// Midheaven (ecliptic longitude) for the right ascension of the meridian `armc`. Single closed-form
// atan2 — no quadrant patching, robust at armc ≈ 0/90/180/270 where an atan-based form needs branches.
export function midheaven(armc, eps) { return raMeridianToEcliptic(armc, eps); }

// Ascendant (ecliptic longitude) — the rising point of the ecliptic on the eastern horizon. Closed
// form; correct in both hemispheres and at high latitude, with none of the sign/branch fixups an
// atan-based derivation needs near the quadrant edges.
export function ascendant(armc, lat, eps) {
  return norm(atan2d(cosd(armc), -(sind(armc) * cosd(eps) + tand(lat) * sind(eps))));
}

// Vertex (ecliptic longitude) — the point on the western horizon that is rising, i.e. the Ascendant
// taken at the anti-meridian (armc + 180) and the observer's co-latitude. Antivertex is +180.
export function vertex(armc, lat, eps) {
  const colat = lat < 0 ? -(90 - Math.abs(lat)) : 90 - Math.abs(lat);
  return ascendant(norm(armc + 180), colat, eps);
}

// Signed shortest arc a->b in (-180, 180].
function arc(a, b) { let d = ((b - a) % 360 + 540) % 360 - 180; return d; }
function midpoint(a, b) { return norm(a + arc(a, b) / 2); }

function porphyryCusps(asc, mc) {
  const ic = norm(mc + 180);
  const q1 = norm(asc - mc);   // MC -> ASC
  const q2 = norm(ic - asc);   // ASC -> IC
  const c11 = norm(mc + q1 / 3), c12 = norm(mc + 2 * q1 / 3);
  const c2 = norm(asc + q2 / 3), c3 = norm(asc + 2 * q2 / 3);
  return [asc, c2, c3, ic, norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
}

// Sripati: the Porphyry cusps are the house midpoints (bhava madhya); each Sripati cusp is the
// midpoint of two adjacent Porphyry cusps.
function sripatiCusps(asc, mc) {
  const p = porphyryCusps(asc, mc);
  return p.map((_, i) => midpoint(p[(i + 11) % 12], p[i]));
}

// Meridian / Axial: equal 30-degree steps along the equator from the ARMC, projected to the ecliptic.
function meridianCusps(armc, eps) {
  return Array.from({ length: 12 }, (_, i) => raMeridianToEcliptic(norm(armc + 30 * (i + 1 - 10)), eps));
}

// Morinus: equal 30-degree steps along the equator from ARMC+90, taken as equatorial points.
function morinusCusps(armc, eps) {
  return Array.from({ length: 12 }, (_, i) => equatorPointToEcliptic(norm(armc + 90 + 30 * i), eps));
}

// Vehlow: equal houses with the Ascendant at the centre of house 1.
function vehlowCusps(asc) {
  return Array.from({ length: 12 }, (_, i) => norm(asc - 15 + 30 * i));
}

// Equal: 30-degree houses measured from the Ascendant (cusp 1 = Asc).
function equalCusps(asc) {
  return Array.from({ length: 12 }, (_, i) => norm(asc + 30 * i));
}

// Whole-sign: each house is one whole zodiac sign; cusp 1 is 0 degrees of the Ascendant's sign.
function wholeSignCusps(asc) {
  const start = Math.floor(norm(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm(start + 30 * i));
}

// Alcabitius: trisect the Ascendant's diurnal and nocturnal semi-arcs in right ascension.
function alcabitiusCusps(armc, asc, mc, lat, eps) {
  const decAsc = asind(sind(asc) * sind(eps));
  let ad = tand(lat) * tand(decAsc);
  ad = ad >= 1 ? 90 : ad <= -1 ? -90 : asind(ad);
  const dsa = 90 + ad, nsa = 90 - ad;
  const ra = {
    11: armc + dsa / 3, 12: armc + 2 * dsa / 3,
    2: armc + dsa + nsa / 3, 3: armc + dsa + 2 * nsa / 3,
  };
  const cusp = n => raMeridianToEcliptic(norm(ra[n]), eps);
  const c11 = cusp(11), c12 = cusp(12), c2 = cusp(2), c3 = cusp(3);
  return [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
}

// Alova's "progressive" pole: below |lat| = 90 - 2*eps it equals the latitude (identical to
// standard Topocentric); above it the pole bends so cusps stay defined to the poles. From Alova,
// "Astrology for All Latitudes: A New Topocentric House System," ISAR International Astrologer,
// Leo 2010 — implemented from the published formula, not from any existing code.
export function progressivePole(lat, eps) {
  const abs = Math.abs(lat), threshold = 90 - 2 * eps;
  if (abs <= threshold) return lat;
  const sign = lat < 0 ? -1 : 1;
  return sign * (abs - ((abs + 2 * eps - 90) ** 2) / (4 * eps));
}

const shouldMod180 = (prev, cur) => (cur < prev ? Math.abs(cur - prev) < 180 : cur - prev >= 180);

// Topocentric (Polich-Page), parameterised by the pole so the progressive variant just swaps it.
function topocentricCusps(armc, asc, mc, pole, eps) {
  const interval = { 11: armc + 30, 12: armc + 60, 2: armc + 120, 3: armc + 150 };
  const ratio = { 11: atand(tand(pole) / 3), 12: atand(2 * tand(pole) / 3), 2: atand(2 * tand(pole) / 3), 3: atand(tand(pole) / 3) };
  const calc = n => {
    const iv = interval[n];
    const m = atand(tand(ratio[n]) / cosd(iv));
    return norm(atand((tand(iv) * cosd(m)) / cosd(m + eps)));
  };
  const c11 = calc(11), c12 = calc(12), c2 = calc(2), c3 = calc(3);
  return assembleQuadrant(asc, mc, c11, c12, c2, c3);
}

// Assemble the 12 cusps of a quadrant system from the four intermediate cusps (11, 12, 2, 3). Each
// intermediate is flipped 180 degrees if it landed in the wrong quadrant relative to its angle
// (MC for 11/12, Asc for 2/3); the remaining cusps are the opposite points of these.
function assembleQuadrant(asc, mc, c11, c12, c2, c3) {
  const fix = (ref, c) => (shouldMod180(ref, c) ? norm(c + 180) : c);
  const f2 = fix(asc, c2), f3 = fix(asc, c3), f11 = fix(mc, c11), f12 = fix(mc, c12);
  return [asc, f2, f3, norm(mc + 180), norm(f11 + 180), norm(f12 + 180),
    norm(asc + 180), norm(f2 + 180), norm(f3 + 180), mc, f11, f12];
}

// Regiomontanus: house circles through the north/south horizon points that divide the celestial
// equator into equal 30-degree arcs from the ARMC. Same ecliptic projection as Topocentric, but the
// pole of each house circle is atan(tan(lat)*sin(offset)) rather than a fixed ratio of the latitude.
function regiomontanusCusps(armc, asc, mc, lat, eps) {
  const off = { 11: 30, 12: 60, 2: 120, 3: 150 };
  const calc = n => {
    const iv = armc + off[n];
    const pole = atand(tand(lat) * sind(off[n]));
    const m = atand(tand(pole) / cosd(iv));
    return norm(atand((tand(iv) * cosd(m)) / cosd(m + eps)));
  };
  return assembleQuadrant(asc, mc, calc(11), calc(12), calc(2), calc(3));
}

// Koch (birthplace / GOH): each intermediate cusp is the Ascendant computed for a sidereal time
// displaced from the ARMC in equal thirds of the MC's diurnal semi-arc. Reuses `ascendant`.
function kochCusps(armc, asc, mc, lat, eps) {
  const decMC = asind(sind(mc) * sind(eps));
  let ad = tand(decMC) * tand(lat);
  ad = ad >= 1 ? 90 : ad <= -1 ? -90 : asind(ad);   // ascensional difference of the MC
  const oaMC = armc - ad;                            // oblique ascension of the MC
  const disp = (armc + 90 - oaMC) / 3;               // cusp displacement interval
  const h11 = oaMC + disp - 90, h12 = h11 + disp, h1 = h12 + disp, h2 = h1 + disp, h3 = h2 + disp;
  const cusp = h => ascendant(norm(h), lat, eps);
  return assembleQuadrant(asc, mc, cusp(h11), cusp(h12), cusp(h2), cusp(h3));
}

// Campanus: house circles through the north/south horizon points that divide the PRIME VERTICAL into
// equal 30-degree arcs from the east point. Solved with vectors in the equatorial (RA) frame: build
// each prime-vertical division point, form the great circle through it and the north horizon point,
// and intersect that circle with the ecliptic. The 180-degree ambiguity is resolved against the
// Porphyry cusp of the same house (a coarse but reliably same-quadrant reference).
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function campanusCusps(armc, asc, mc, lat, eps) {
  const cR = cosd(armc), sR = sind(armc), cf = cosd(lat), sf = sind(lat), cE = cosd(eps), sE = sind(eps);
  const Z = [cf * cR, cf * sR, sf];        // zenith
  const Nh = [sf * cR, sf * sR, -cf];      // north point of the horizon
  const Eh = [-sR, cR, 0];                 // east point of the horizon
  const K = [0, -sE, cE];                  // north ecliptic pole
  const lonOf = v => norm(atan2d(v[1] * cE + v[2] * sE, v[0]));   // ecliptic longitude of a direction
  const p = porphyryCusps(asc, mc);
  // Prime-vertical angle theta (from the east point toward the zenith) and the Porphyry reference.
  const cuspAt = (theta, ref) => {
    const P = [cosd(theta) * Eh[0] + sind(theta) * Z[0], cosd(theta) * Eh[1] + sind(theta) * Z[1], cosd(theta) * Eh[2] + sind(theta) * Z[2]];
    const d = vcross(vcross(Nh, P), K);    // ecliptic intersection direction
    const l = lonOf(d);
    return Math.abs(arc(ref, l)) <= Math.abs(arc(ref, norm(l + 180))) ? l : norm(l + 180);
  };
  const c11 = cuspAt(60, p[10]), c12 = cuspAt(30, p[11]), c2 = cuspAt(-30, p[1]), c3 = cuspAt(-60, p[2]);
  return [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180),
    norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
}

// Ecliptic longitude where a house circle with equatorial normal `n` meets the ecliptic: solve
// n·e(λ)=0 for e(λ)=(cos λ, sin λ cos ε, sin λ sin ε). The circle also meets at λ+180; caller picks.
const circleMeetsEcliptic = (n, eps) => norm(atan2d(-n[0], n[1] * cosd(eps) + n[2] * sind(eps)));
// Of the two antipodal intersections, pick the one on the arc sweeping `from`→`to`.
const branchInSweep = (lambda, from, to) =>
  Math.sign(arc(from, lambda)) === Math.sign(arc(from, to)) ? lambda : norm(lambda + 180);

// Sunshine (Makransky): a solar-arc system. The Sun's ascensional difference sets its
// diurnal/nocturnal semi-arcs; each of the four quadrants of the Sun's daily path is split into three
// equal hour-angle steps, and each cusp is where the great circle through the horizon's N/S points
// and the point on the Sun's declination parallel at that hour angle meets the ecliptic. Needs the
// Sun's declination `sunDec` (deg). Returns [cusp1..cusp12] (cusp1 = Ascendant, cusp10 = MC).
// Ported from the clean-room astro-ephemeris implementation (validated black-box against published
// reference cusps), derived from the method's published geometric definition — not from any existing code.
function sunshineCusps(armc, lat, eps, sunDec) {
  const argv = tand(sunDec) * tand(lat);
  const ad = argv >= 1 ? 90 - 1e-10 : argv <= -1 ? -90 + 1e-10 : asind(argv); // ascensional difference
  const dsa = 90 + ad, nsa = 90 - ad;                                          // diurnal/nocturnal semi-arcs
  const m1 = [sind(lat) * cosd(armc), sind(lat) * sind(armc), -cosd(lat)];     // north horizon point (RA/dec frame)
  const mc = midheaven(armc, eps), asc = ascendant(armc, lat, eps);
  const angles = [asc, norm(mc + 180), norm(asc + 180), mc, asc];             // AC, IC, DC, MC, AC
  const starts = [-dsa, -180, -(270 - ad), -360];
  const steps = [nsa, nsa, dsa, dsa];
  const cusps = [];
  for (let q = 0; q < 4; q++) {
    for (let j = 0; j < 3; j++) {
      const hourAngle = starts[q] - j * steps[q] / 3;
      const ra = armc - hourAngle;
      const p = [cosd(sunDec) * cosd(ra), cosd(sunDec) * sind(ra), sind(sunDec)];
      const lambda = circleMeetsEcliptic(vcross(m1, p), eps);
      cusps.push(j === 0 ? angles[q] : branchInSweep(lambda, angles[q], angles[q + 1]));
    }
  }
  // Inside the polar circle, when the MC degree is below the horizon the sequence reflects about the
  // MC/IC axis: cusp m ↦ 6 − m.
  const mcDec = atand(sind(armc) * tand(eps));
  if (Math.abs(lat - mcDec) > 90) return cusps.map((_, m) => cusps[(6 + 12 - m) % 12]);
  return cusps;
}

// Placidus: iterate each intermediate cusp so its meridian distance is 1/3 or 2/3 of its own
// (declination-dependent) semi-arc. A true iterated Placidus — not the Topocentric approximation
// that results when the iteration is skipped.
function placidusSolve(armc, lat, eps, fraction, below, sign) {
  let ra = norm(armc + (below ? 180 : 0) + sign * fraction * 90);
  for (let i = 0; i < 200; i++) {
    const lam = atan2d(sind(ra), cosd(ra) * cosd(eps));
    const dec = asind(sind(eps) * sind(lam));
    let arg = tand(dec) * tand(lat); arg = arg > 1 ? 1 : arg < -1 ? -1 : arg;
    const sa = below ? 90 - asind(arg) : 90 + asind(arg);
    const target = norm(armc + (below ? 180 : 0) + sign * fraction * sa);
    const converged = Math.abs(((target - ra + 540) % 360) - 180) < 1e-11;
    ra = target;
    if (converged) break;
  }
  return norm(atan2d(sind(ra), cosd(ra) * cosd(eps)));
}
function placidusCusps(armc, asc, mc, lat, eps) {
  const c11 = placidusSolve(armc, lat, eps, 1 / 3, false, 1), c12 = placidusSolve(armc, lat, eps, 2 / 3, false, 1);
  const c2 = placidusSolve(armc, lat, eps, 2 / 3, true, -1), c3 = placidusSolve(armc, lat, eps, 1 / 3, true, -1);
  return [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
}

export function houseCusps(system, { armc, asc, mc, lat, eps, sunDec }) {
  switch (system) {
    case 'placidus': return placidusCusps(armc, asc, mc, lat, eps);
    case 'porphyry': return porphyryCusps(asc, mc);
    case 'sripati': return sripatiCusps(asc, mc);
    case 'meridian': return meridianCusps(armc, eps);
    case 'morinus': return morinusCusps(armc, eps);
    case 'vehlow': return vehlowCusps(asc);
    case 'equal': return equalCusps(asc);
    case 'whole-sign': return wholeSignCusps(asc);
    case 'alcabitius': return alcabitiusCusps(armc, asc, mc, lat, eps);
    case 'regiomontanus': return regiomontanusCusps(armc, asc, mc, lat, eps);
    case 'campanus': return campanusCusps(armc, asc, mc, lat, eps);
    case 'koch': return kochCusps(armc, asc, mc, lat, eps);
    case 'sunshine':
      if (sunDec == null) throw new Error("houseCusps: 'sunshine' requires `sunDec` (the Sun's declination in degrees)");
      return sunshineCusps(armc, lat, eps, sunDec);
    case 'topocentric': return topocentricCusps(armc, asc, mc, lat, eps);
    case 'topocentric-progressive': return topocentricCusps(armc, asc, mc, progressivePole(lat, eps), eps);
    default: return null;
  }
}

// Every system houseCusps can compute, in a stable order.
export const HOUSE_SYSTEMS = ['placidus', 'koch', 'campanus', 'regiomontanus', 'porphyry', 'sripati', 'meridian', 'morinus', 'vehlow', 'equal', 'whole-sign', 'alcabitius', 'topocentric', 'topocentric-progressive', 'sunshine'];
