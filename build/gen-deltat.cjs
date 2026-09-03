// Build src/delta-t.js (and, if present, the Rust module) from public-domain sources.
// Modern years (1973..end of IERS predictions) come from IERS Earth Orientation
// data: ΔT = 32.184 + (TAI−UTC leap seconds) − (UT1−UTC), the UT1−UTC read from the
// Bulletin A column of finals.all. Years outside that span (1620..1972 and the far future to 2100)
// come from the Espenak & Meeus (NASA GSFC) ΔT polynomial expressions, a public-domain standard;
// the future branch is shifted by a constant so it joins the last IERS value continuously.
const fs = require("fs");
const finalsPath = process.argv[2] || "/tmp/finals.all";

const YEAR0 = 1620, YEAR1 = 2100;

// --- leap seconds (TAI − UTC), effective date → count. Value in force on Jan 1 of each year. ---
const LEAPS = [
  [1972.00, 10], [1972.50, 11], [1973.00, 12], [1974.00, 13], [1975.00, 14], [1976.00, 15],
  [1977.00, 16], [1978.00, 17], [1979.00, 18], [1980.00, 19], [1981.50, 20], [1982.50, 21],
  [1983.50, 22], [1985.50, 23], [1988.00, 24], [1990.00, 25], [1991.00, 26], [1992.50, 27],
  [1993.50, 28], [1994.50, 29], [1996.00, 30], [1997.50, 31], [1999.00, 32], [2006.00, 33],
  [2009.00, 34], [2012.50, 35], [2015.50, 36], [2017.00, 37],
];
const leapJan1 = year => { let v = LEAPS[0][1]; for (const [t, n] of LEAPS) if (t <= year) v = n; return v; };

// --- Espenak & Meeus (NASA GSFC) ΔT polynomials (public domain), for the years IERS doesn't cover. ---
function espenakMeeus(y) {
  let t, u;
  if (y < 1700)      { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129; }
  if (y < 1800)      { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
  if (y < 1860)      { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
  if (y < 1900)      { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920)      { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941)      { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3; }
  if (y < 1961)      { t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
  if (y < 1986)      { t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
  if (y < 2005)      { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050)      { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y);
}

// --- IERS finals.all: UT1−UTC (Bulletin A, seconds) at the first January day of each year. ---
const lines = fs.readFileSync(finalsPath, "utf8").split("\n");
const ut1Jan = {};                       // year → UT1−UTC on ~Jan 1
for (const L of lines) {
  if (L.length < 68) continue;
  const yy = +L.slice(0, 2), mm = +L.slice(2, 4), dd = +L.slice(4, 6);
  if (mm !== 1 || dd > 2) continue;      // Jan 1 (finals starts 1973 on Jan 2)
  const v = parseFloat(L.slice(58, 68));
  if (isNaN(v)) continue;
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  if (!(year in ut1Jan) || dd === 1) ut1Jan[year] = v;
}
const iersYears = Object.keys(ut1Jan).map(Number).sort((a, b) => a - b);
const iersFirst = iersYears[0], iersLast = iersYears[iersYears.length - 1];
const iersDeltaT = year => 32.184 + leapJan1(year) - ut1Jan[year];

// Constant shift so the Espenak–Meeus future branch meets the last IERS value with no step.
const futureOffset = iersDeltaT(iersLast) - espenakMeeus(iersLast);

const vals = [];
for (let y = YEAR0; y <= YEAR1; y++) {
  let dt;
  if (y >= iersFirst && y <= iersLast) dt = iersDeltaT(y);          // IERS observed/predicted
  else if (y < iersFirst)              dt = espenakMeeus(y);        // historical model
  else                                 dt = espenakMeeus(y) + futureOffset; // continuous future
  vals.push(Math.round(dt * 1000) / 1000);
}
console.log(`IERS span ${iersFirst}..${iersLast}; future offset ${futureOffset.toFixed(3)}s; ${vals.length} years`);

// --- write src/delta-t.js (same API as before) ---
const grid = (a, rust) => a.map((v, i) => (i && i % 10 === 0 ? "\n  " : "") + (rust && Number.isInteger(v) ? v + ".0" : v)).join(", ");
const provenance = `Delta-T (TT - UT, seconds) at Jan 1 of each year ${YEAR0}..${YEAR1}. Modern years from IERS\n// Earth Orientation data (UT1-UTC + leap seconds); historical/far-future from the Espenak-Meeus\n// polynomials. Regenerate: build/fetch-deltat.sh.`;
fs.writeFileSync("src/delta-t.js",
`// ${provenance}\n// Astronomy Engine's own Delta-T prediction is stale for the 2020s (over-predicts ~2025 by ~6 s),\n// which shifts the Moon ~3 arcsec; this table corrects it.\n` +
`export const DELTA_T_YEAR0 = ${YEAR0};\nexport const DELTA_T = [\n  ${grid(vals)}\n];\n` +
`export function deltaTSeconds(jdUt) {\n  const year = 2000 + (jdUt - 2451545.0) / 365.25;\n  const n = DELTA_T.length, last = DELTA_T_YEAR0 + n - 1;\n  if (year <= DELTA_T_YEAR0) return DELTA_T[0] + (DELTA_T[1] - DELTA_T[0]) * (year - DELTA_T_YEAR0);\n  if (year >= last) return DELTA_T[n - 1] + (DELTA_T[n - 1] - DELTA_T[n - 2]) * (year - last);\n  const i = Math.floor(year) - DELTA_T_YEAR0;\n  return DELTA_T[i] + (DELTA_T[i + 1] - DELTA_T[i]) * (year - Math.floor(year));\n}\n`);

// Rust module for the astro-ephemeris port, if present.
const rustDir = require("os").homedir() + "/work/astro-ephemeris/src";
if (fs.existsSync(rustDir)) {
  fs.writeFileSync(rustDir + "/delta_t.rs",
`// GENERATED from falcon-ephemeris/src/delta-t.js — do not hand-edit.\n// ${provenance.replace(/\n\/\//g, "\n//")}\n` +
`pub const DELTA_T_YEAR0: f64 = ${YEAR0}.0;\npub static DELTA_T: &[f64] = &[\n    ${grid(vals, true).replace(/\n  /g, "\n    ")}\n];\n\n` +
`/// Delta-T (seconds) for a UT Julian day; linearly interpolated, extrapolated linearly outside.\npub fn delta_t_seconds(jd_ut: f64) -> f64 {\n    let year = 2000.0 + (jd_ut - 2451545.0) / 365.25;\n    let n = DELTA_T.len();\n    let last = DELTA_T_YEAR0 + (n - 1) as f64;\n    if year <= DELTA_T_YEAR0 { return DELTA_T[0] + (DELTA_T[1] - DELTA_T[0]) * (year - DELTA_T_YEAR0); }\n    if year >= last { return DELTA_T[n - 1] + (DELTA_T[n - 1] - DELTA_T[n - 2]) * (year - last); }\n    let i = (year.floor() - DELTA_T_YEAR0) as usize;\n    DELTA_T[i] + (DELTA_T[i + 1] - DELTA_T[i]) * (year - year.floor())\n}\n`);
  console.log("wrote src/delta-t.js + ~/work/astro-ephemeris/src/delta_t.rs");
} else {
  console.log("wrote src/delta-t.js (astro-ephemeris not found; skipped Rust module)");
}
