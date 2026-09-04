// Regenerate test/house-reference-swetest.js from swetest (the Swiss Ephemeris CLI). swetest's
// numeric house output is authoritative third-party reference DATA (facts, not code); we store its
// anchors and cusps so the test suite can validate falcon's house-division math black-box against it.
// Usage: SWETEST=/path/to/swetest node build/gen-house-reference.mjs   (defaults to ~/bin/swetest)
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const SWE = process.env.SWETEST || process.env.HOME + '/bin/swetest';

const CASES = [
  { name: 'berlin_2000',  date: '1.1.2000',  ut: '12:00', lat: 52.5,   lon: 13.4 },
  { name: 'nyc_1990',     date: '1.1.1990',  ut: '12:00', lat: 40.71,  lon: -74.006 },
  { name: 'quito_2010',   date: '21.6.2010', ut: '12:00', lat: -0.18,  lon: -78.5 },
  { name: 'sydney_1985',  date: '15.9.1985', ut: '06:00', lat: -33.87, lon: 151.2 },
  { name: 'oslo_1975',    date: '1.3.1975',  ut: '03:00', lat: 59.91,  lon: 10.75 },
  { name: 'london_1985',  date: '13.7.1985', ut: '09:30', lat: 51.5,   lon: -0.13 },
];
const SYSTEMS = { placidus:'P', koch:'K', campanus:'C', regiomontanus:'R', porphyry:'O',
  meridian:'X', morinus:'M', vehlow:'V', equal:'A', 'whole-sign':'W', alcabitius:'B',
  topocentric:'T', sunshine:'i' };

const dms = s => { const m = s.match(/(-?\d+)°\s*(\d+)'\s*([\d.]+)/); if (!m) return null;
  const sign = m[1].startsWith('-') ? -1 : 1; return sign * (Math.abs(+m[1]) + (+m[2])/60 + (+m[3])/3600); };
const run = (args) => execFileSync(SWE, args, { encoding: 'utf8' });

function houseRun(c, letter) {
  const out = run(['-b'+c.date, '-ut'+c.ut, `-house${c.lon},${c.lat},${letter}`]);
  const anchors = {}, cusps = [];
  for (const line of out.split('\n')) {
    let m;
    if ((m = line.match(/^Epsilon \(t\/m\)\s+(.+?)\s{2,}/))) anchors.eps = dms(m[1]);
    else if ((m = line.match(/^ARMC\s+(.+?)\s{2,}/))) anchors.armc = dms(m[1]);
    else if ((m = line.match(/^Ascendant\s+(.+?)\s{2,}/))) anchors.asc = dms(m[1]);
    else if ((m = line.match(/^MC\s+(.+?)\s{2,}/))) anchors.mc = dms(m[1]);
    else if ((m = line.match(/^house\s+(\d+)\s+(.+?)\s{2,}/))) cusps[+m[1]-1] = dms(m[2]);
  }
  return { anchors, cusps };
}
function sunDecl(c) {
  const out = run(['-b'+c.date, '-ut'+c.ut, '-p0', '-fPad', '-head']);
  const m = out.match(/^Sun\s+[\d.]+\s+(-?[\d.]+)/m);
  return +m[1];
}

const fixtures = {};
for (const c of CASES) {
  const base = houseRun(c, 'P');
  const rec = { lat: c.lat, sunDec: sunDecl(c), ...base.anchors, systems: {} };
  for (const [sys, letter] of Object.entries(SYSTEMS)) rec.systems[sys] = houseRun(c, letter).cusps;
  fixtures[c.name] = rec;
  console.log(c.name, 'armc', rec.armc?.toFixed(3), 'asc', rec.asc?.toFixed(3), 'eps', rec.eps?.toFixed(4), 'sunDec', rec.sunDec?.toFixed(3), '| placidus c2', rec.systems.placidus[1]?.toFixed(3));
}
const header = `// House-cusp reference fixtures generated from swetest (Swiss Ephemeris CLI) — authoritative\n// third-party output used as black-box validation data (numeric facts, not code). Each case stores\n// swetest's own anchors (armc/asc/mc/eps, plus the Sun's declination for Sunshine) and the 12 cusps\n// per system, so a test can feed the anchors to houseCusps and compare. Regenerate: build/gen-house-reference.mjs.\n`;
writeFileSync('test/house-reference-swetest.js', header + 'export const SWETEST_HOUSES = ' + JSON.stringify(fixtures, null, 1) + ';\n');
console.log('\nwrote test/house-reference-swetest.js');
