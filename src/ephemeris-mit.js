// Ephemeris engine providing the interface CircularNatalHoroscopeJS expects. Positions from
// Astronomy Engine (MIT); Eris + the major asteroids + Chiron from a fitted table of JPL Horizons
// osculating elements; the Uranian TNPs from a two-body Kepler solve of their fixed "Neely"
// osculating elements.
import * as A from 'astronomy-engine';
import { ASTEROID_ELEMENTS } from './asteroid-elements.js';
import { deltaTSeconds } from './delta-t.js';

const DEG = Math.PI / 180, K = 0.01720209895, C_AUD = 173.144632674, GS = K * K; // GM_sun, AU^3/day^2
const J1900 = 2415020.0, J2000 = 2451545.0;
const norm360 = x => ((x % 360) + 360) % 360;
const norm180 = x => { let v = ((x % 360) + 360) % 360; return v > 180 ? v - 360 : v; };
// Mean lunar apogee = Black Moon Lilith (ecliptic longitude, deg). Perigee+180 in the orbital plane,
// projected onto the ecliptic through the mean node and inclination — the standard mean-apogee
// definition, matched to ~15". `T` = Julian centuries (TT) from J2000. Priapus (mean perigee) = this + 180.
const MOON_MEAN_INCL = 5.1453964;
function meanLunarApogee(T) {
  const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000;
  const Om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000;
  const u = (L - Mp + 180) - Om;
  return norm360(Om + Math.atan2(Math.cos(MOON_MEAN_INCL * DEG) * Math.sin(u * DEG), Math.cos(u * DEG)) / DEG);
}

// Fixed heliocentric osculating elements for the (hypothetical) Uranian TNPs: the James Neely
// element set (equinox/epoch J1900). a in AU, angles in degrees, M0 = mean anomaly at epoch.
// Real bodies (Eris + asteroids + Chiron) use the fitted Horizons table instead.
const ELEMENTS = [
  { key: 'cupido',   epoch: J1900, equinox: J1900, a: 40.99837, e: 0.00460, i: 1.0833, node: 129.8325, argperi: 171.4333, M0: 163.7409 },
  { key: 'hades',    epoch: J1900, equinox: J1900, a: 50.66744, e: 0.00245, i: 1.0500, node: 161.3339, argperi: 148.1796, M0: 27.6496 },
  { key: 'zeus',     epoch: J1900, equinox: J1900, a: 59.21436, e: 0.00120, i: 0.0, node: 0.0, argperi: 299.0440, M0: 165.1232 },
  { key: 'kronos',   epoch: J1900, equinox: J1900, a: 64.81960, e: 0.00305, i: 0.0, node: 0.0, argperi: 208.8801, M0: 169.0193 },
  { key: 'apollon',  epoch: J1900, equinox: J1900, a: 70.29949, e: 0.0, i: 0.0, node: 0.0, argperi: 0.0, M0: 138.0533 },
  { key: 'admetos',  epoch: J1900, equinox: J1900, a: 73.62765, e: 0.0, i: 0.0, node: 0.0, argperi: 0.0, M0: 351.3350 },
  { key: 'vulkanus', epoch: J1900, equinox: J1900, a: 77.25568, e: 0.0, i: 0.0, node: 0.0, argperi: 0.0, M0: 55.8983 },
  { key: 'poseidon', epoch: J1900, equinox: J1900, a: 83.66907, e: 0.0, i: 0.0, node: 0.0, argperi: 0.0, M0: 165.5163 },
];
const AE_BODIES = { sun: A.Body.Sun, mercury: A.Body.Mercury, venus: A.Body.Venus, mars: A.Body.Mars, jupiter: A.Body.Jupiter, saturn: A.Body.Saturn, uranus: A.Body.Uranus, neptune: A.Body.Neptune, pluto: A.Body.Pluto };
// Astronomy Engine's built-in Delta-T prediction is stale for the 2020s; override TT with our table.
function makeTime(utcDate) { const t = A.MakeTime(utcDate); t.tt = t.ut + deltaTSeconds(t.ut + J2000) / 86400; return t; }

function solveKepler(M, e) { M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); let E = e < 0.8 ? M : Math.PI; for (let i = 0; i < 100; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-13) break; } return E; }
function helioEclOfEquinox(el, jd) {
  const n = K / Math.pow(el.a, 1.5);
  const E = solveKepler(el.M0 * DEG + n * (jd - el.epoch), el.e);
  const xv = el.a * (Math.cos(E) - el.e), yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const w = el.argperi * DEG, i = el.i * DEG, O = el.node * DEG;
  const cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i), cw = Math.cos(w), sw = Math.sin(w);
  return { x: (cO * cw - sO * sw * ci) * xv + (-cO * sw - sO * cw * ci) * yv, y: (sO * cw + cO * sw * ci) * xv + (-sO * sw + cO * cw * ci) * yv, z: (sw * si) * xv + (cw * si) * yv };
}
function matMul(rot, v) { return { x: rot.rot[0][0] * v.x + rot.rot[1][0] * v.y + rot.rot[2][0] * v.z, y: rot.rot[0][1] * v.x + rot.rot[1][1] * v.y + rot.rot[2][1] * v.z, z: rot.rot[0][2] * v.x + rot.rot[1][2] * v.y + rot.rot[2][2] * v.z }; }
// Vondrak, Capitaine & Wallace (2011) long-term precession. Coefficients from the ERFA/SOFA
// reference implementation (public-domain constants).
const DAS2R = DEG / 3600, D2PI = 2 * Math.PI, EPS0 = 84381.406 * DAS2R;
const PQPOL = [[5851.607687, -0.1189000, -0.00028913, 0.000000101], [-1600.886300, 1.1689818, -0.00000020, -0.000000437]];
const PQPER = [[708.15, -5486.751211, -684.661560, 667.666730, -5523.863691], [2309.00, -17.127623, 2446.283880, -2354.886252, -549.747450], [1620.00, -617.517403, 399.671049, -428.152441, -310.998056], [492.20, 413.442940, -356.652376, 376.202861, 421.535876], [1183.00, 78.614193, -186.387003, 184.778874, -36.776172], [622.00, -180.732815, -316.800070, 335.321713, -145.278396], [882.00, -87.676083, 198.296701, -185.138669, -34.744450], [547.00, 46.140315, 101.135679, -120.972830, 22.885731]];
const XYPOL = [[5453.282155, 0.4252841, -0.00037173, -0.000000152], [-73750.930350, -0.7675452, -0.00018725, 0.000000231]];
const XYPER = [[256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853], [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698], [274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038], [241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396], [2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422], [492.20, 871.855056, 699.291817, 639.744522, -846.485643], [396.10, 44.769698, 153.167220, 131.600209, -1393.124055], [288.90, -512.313065, -950.865637, -445.040117, 368.526116], [231.10, -819.415595, 499.754645, 584.522874, 749.045012], [1610.00, -538.071099, -145.188210, -89.756563, 444.704518], [620.00, -189.793622, 558.116553, 524.429630, 235.934465], [157.87, -402.922932, -23.923029, -13.549067, 374.049623], [220.30, 179.516345, -165.405086, -210.157124, -171.330180], [1200.00, -9.814756, 9.344131, -44.919798, -22.899655]];
function ltpecl(epj) { // ecliptic pole (EQJ), Vondrak
  const t = (epj - 2000) / 100; let p = 0, q = 0; const w0 = D2PI * t;
  for (const r of PQPER) { const a = w0 / r[0], s = Math.sin(a), c = Math.cos(a); p += c * r[1] + s * r[3]; q += c * r[2] + s * r[4]; }
  let w = 1; for (let i = 0; i < 4; i++) { p += PQPOL[0][i] * w; q += PQPOL[1][i] * w; w *= t; }
  p *= DAS2R; q *= DAS2R; w = 1 - p * p - q * q; w = w < 0 ? 0 : Math.sqrt(w);
  const s = Math.sin(EPS0), c = Math.cos(EPS0);
  return [p, -q * c - w * s, -q * s + w * c];
}
function ltpequ(epj) { // equator pole (EQJ), Vondrak
  const t = (epj - 2000) / 100; let x = 0, y = 0; const w0 = D2PI * t;
  for (const r of XYPER) { const a = w0 / r[0], s = Math.sin(a), c = Math.cos(a); x += c * r[1] + s * r[3]; y += c * r[2] + s * r[4]; }
  let w = 1; for (let i = 0; i < 4; i++) { x += XYPOL[0][i] * w; y += XYPOL[1][i] * w; w *= t; }
  x *= DAS2R; y *= DAS2R; w = 1 - x * x - y * y;
  return [x, y, w < 0 ? 0 : Math.sqrt(w)];
}
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = a => { const m = Math.hypot(a[0], a[1], a[2]); return [a[0] / m, a[1] / m, a[2] / m]; };
// Axes (in EQJ) of the mean ecliptic & equinox of `epochJD`. A heliocentric vector given in that
// ecliptic frame maps to EQJ via v.x*xe + v.y*ye + v.z*ze.
function eclFrameEQJ(epochJD) {
  const epj = 2000 + (epochJD - J2000) / 365.25;
  const ze = ltpecl(epj), pe = ltpequ(epj);
  const xe = norm3(cross3(pe, ze)), ye = cross3(ze, xe);
  return { xe, ye, ze };
}
function keplerGeoEQJ(el, t) {
  const jd = t.tt + J2000, earth = A.HelioVector(A.Body.Earth, t);
  const fr = eclFrameEQJ(el.equinox); // Vondrak: mean ecliptic of the elements' equinox, in EQJ
  const helioEqj = v => ({ x: v.x * fr.xe[0] + v.y * fr.ye[0] + v.z * fr.ze[0], y: v.x * fr.xe[1] + v.y * fr.ye[1] + v.z * fr.ze[1], z: v.x * fr.xe[2] + v.y * fr.ye[2] + v.z * fr.ze[2] });
  // Light-time: iterate the retarded heliocentric body position until convergence.
  let vEqj = helioEqj(helioEclOfEquinox(el, jd)), lt = 0;
  for (let k = 0; k < 3; k++) {
    const gx = vEqj.x - earth.x, gy = vEqj.y - earth.y, gz = vEqj.z - earth.z;
    lt = Math.sqrt(gx * gx + gy * gy + gz * gz) / C_AUD;
    vEqj = helioEqj(helioEclOfEquinox(el, jd - lt));
  }
  let gx = vEqj.x - earth.x, gy = vEqj.y - earth.y, gz = vEqj.z - earth.z;
  // Gravitational light deflection by the Sun (NOVAS grav_vec formulation).
  {
    const pmag = Math.sqrt(gx * gx + gy * gy + gz * gz);
    const emag = Math.sqrt(earth.x * earth.x + earth.y * earth.y + earth.z * earth.z);
    const qmag = Math.sqrt(vEqj.x * vEqj.x + vEqj.y * vEqj.y + vEqj.z * vEqj.z);
    const px = gx / pmag, py = gy / pmag, pz = gz / pmag;
    const ex = earth.x / emag, ey = earth.y / emag, ez = earth.z / emag;
    const qx = vEqj.x / qmag, qy = vEqj.y / qmag, qz = vEqj.z / qmag;
    const pdotq = px * qx + py * qy + pz * qz, edotp = ex * px + ey * py + ez * pz, qdote = qx * ex + qy * ey + qz * ez;
    const fac = 2 * GS / (C_AUD * C_AUD) / emag / (1 + qdote);
    gx += pmag * fac * (pdotq * ex - edotp * qx);
    gy += pmag * fac * (pdotq * ey - edotp * qy);
    gz += pmag * fac * (pdotq * ez - edotp * qz);
  }
  // Annual aberration (observer velocity).
  const est = A.HelioState(A.Body.Earth, t), gm = Math.sqrt(gx * gx + gy * gy + gz * gz);
  return { x: gx + est.vx / C_AUD * gm, y: gy + est.vy / C_AUD * gm, z: gz + est.vz / C_AUD * gm };
}
function eclLon(vecEQJ, rotEqjEct) { const e = matMul(rotEqjEct, vecEQJ); return norm360(Math.atan2(e.y, e.x) / DEG); }
// True obliquity of the ecliptic (deg) for a UTC Date: IAU 2006 precession + nutation.
// (Astronomy Engine's precession agrees with Vondrak to <0.05" over 1900-2100.)
export function obliquity(utcDate) { return A.e_tilt(makeTime(utcDate)).tobl; }
// Local apparent sidereal time = right ascension of the MC (ARMC), degrees, for a UTC Date.
export function apparentSiderealTime(utcDate, longitude) { return norm360(A.SiderealTime(makeTime(utcDate)) * 15 + longitude); }
// Main-belt asteroids and Chiron are perturbed, so a single element set can't span decades. Pick the
// nearest of the tabulated 180-day-epoch element sets and let keplerGeoEQJ propagate the small
// remainder (a few arcsec). Row = [daysFromJ2000, a, e, i, node, argperi, M0].
function tabElementsAt(rows, jd) {
  const key = jd - J2000;
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rows[mid][0] < key) lo = mid; else hi = mid; }
  const r = (key - rows[lo][0]) <= (rows[hi][0] - key) ? rows[lo] : rows[hi];
  return { epoch: r[0] + J2000, equinox: J2000, a: r[1], e: r[2], i: r[3], node: r[4], argperi: r[5], M0: r[6] };
}

export default class Ephemeris {
  constructor({ year = 0, month = 0, day = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    const t = makeTime(new Date(Date.UTC(year, month, day, hours, minutes, seconds)));
    const tN = makeTime(new Date(Date.UTC(year, month, day, hours, minutes, seconds) + 43200000)); // +0.5d for retro
    const rot = A.Rotation_EQJ_ECT(t), rotN = A.Rotation_EQJ_ECT(tN);
    const retro = (l1, l2) => norm180(l2 - l1) < 0;
    this.Results = [];
    for (const [key, body] of Object.entries(AE_BODIES)) {
      const lon = eclLon(A.GeoVector(body, t, true), rot), lonN = eclLon(A.GeoVector(body, tN, true), rotN);
      this.Results.push({ key, position: { apparentLongitude: lon }, motion: { isRetrograde: retro(lon, lonN) } });
    }
    const m = A.EclipticGeoMoon(t), T = t.tt / 36525.0;
    const node = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000);
    const apogee = meanLunarApogee(T);
    this.Results.push({ key: 'moon', position: { apparentLongitude: norm360(m.lon), apparentGeocentric: { longitude: norm360(m.lon) * DEG, latitude: m.lat * DEG, distance: m.dist } }, motion: { isRetrograde: false }, orbit: { meanAscendingNode: { apparentLongitude: node }, meanDescendingNode: { apparentLongitude: norm360(node + 180) }, meanApogee: { apparentLongitude: apogee }, meanPerigee: { apparentLongitude: norm360(apogee + 180) } } });
    for (const el of ELEMENTS) {
      const lon = eclLon(keplerGeoEQJ(el, t), rot), lonN = eclLon(keplerGeoEQJ(el, tN), rotN);
      this.Results.push({ key: el.key, position: { apparentLongitude: lon }, motion: { isRetrograde: retro(lon, lonN) } });
    }
    for (const key of Object.keys(ASTEROID_ELEMENTS)) {
      const rows = ASTEROID_ELEMENTS[key];
      const lon = eclLon(keplerGeoEQJ(tabElementsAt(rows, t.tt + J2000), t), rot);
      const lonN = eclLon(keplerGeoEQJ(tabElementsAt(rows, tN.tt + J2000), tN), rotN);
      this.Results.push({ key, position: { apparentLongitude: lon }, motion: { isRetrograde: retro(lon, lonN) } });
    }
  }
}
