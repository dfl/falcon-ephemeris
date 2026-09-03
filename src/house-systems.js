// Extra house systems not provided by CircularNatalHoroscopeJS. Pure functions of the chart's
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
// standard Topocentric); above it the pole bends so cusps stay defined to the poles.
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
  const c4 = norm(mc + 180), c7 = norm(asc + 180);
  const fix = (ref, c) => (shouldMod180(ref, c) ? norm(c + 180) : c);
  const f2 = fix(asc, c2), f3 = fix(asc, c3), f11 = fix(mc, c11), f12 = fix(mc, c12);
  return [asc, f2, f3, c4, norm(f11 + 180), norm(f12 + 180), c7, norm(f2 + 180), norm(f3 + 180), mc, f11, f12];
}

// Placidus: iterate each intermediate cusp so its meridian distance is 1/3 or 2/3 of its own
// (declination-dependent) semi-arc. CircularNatal's built-in "Placidus" is actually Topocentric
// (its iteration is a no-op), so we compute the true one here.
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

export function houseCusps(system, { armc, asc, mc, lat, eps }) {
  switch (system) {
    case 'placidus': return placidusCusps(armc, asc, mc, lat, eps);
    case 'porphyry': return porphyryCusps(asc, mc);
    case 'sripati': return sripatiCusps(asc, mc);
    case 'meridian': return meridianCusps(armc, eps);
    case 'morinus': return morinusCusps(armc, eps);
    case 'vehlow': return vehlowCusps(asc);
    case 'alcabitius': return alcabitiusCusps(armc, asc, mc, lat, eps);
    case 'topocentric': return topocentricCusps(armc, asc, mc, lat, eps);
    case 'topocentric-progressive': return topocentricCusps(armc, asc, mc, progressivePole(lat, eps), eps);
    default: return null;
  }
}

export const CUSTOM_HOUSE_SYSTEMS = ['placidus', 'porphyry', 'sripati', 'meridian', 'morinus', 'vehlow', 'alcabitius', 'topocentric-progressive'];
