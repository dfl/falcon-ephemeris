import { describe, it, expect } from 'vitest';
import { houseCusps, ascendant, midheaven, progressivePole, HOUSE_SYSTEMS } from '../src/house-systems.js';
import { HOUSE_FIXTURES } from './house-reference.js';

function angSep(a, b) { let d = ((a - b + 540) % 360) - 180; return Math.abs(d); }
const arc = (a, b) => ((b - a) % 360 + 540) % 360 - 180;

// Systems we compute and can check directly against reference cusps.
const CHECKED = ['placidus', 'porphyry', 'sripati', 'meridian', 'morinus', 'vehlow', 'alcabitius', 'topocentric'];
const TOL_ARCSEC = 30; // anchors are exact, so only the house-division math is under test

describe('house systems vs reference cusps', () => {
  for (const [chart, fx] of Object.entries(HOUSE_FIXTURES)) {
    const params = { armc: fx.armc, asc: fx.asc, mc: fx.mc, lat: fx.lat, eps: fx.eps };
    describe(chart, () => {
      for (const system of CHECKED) {
        const expected = fx.systems[system];
        it(`${system} — 12 cusps within ${TOL_ARCSEC}"`, () => {
          const got = houseCusps(system, params);
          expect(got, `${system} not implemented`).toBeTruthy();
          for (let i = 0; i < 12; i++) {
            const err = angSep(got[i], expected[i]) * 3600;
            expect(err, `${system} cusp ${i + 1}: got ${got[i].toFixed(4)}, expected ${expected[i]} (err ${err.toFixed(1)}")`).toBeLessThan(TOL_ARCSEC);
          }
        });
      }
    });
  }
});

describe('ascendant / midheaven closed forms vs reference anchors', () => {
  for (const [chart, fx] of Object.entries(HOUSE_FIXTURES)) {
    it(`${chart}: asc & mc within 1" of the reference`, () => {
      expect(angSep(ascendant(fx.armc, fx.lat, fx.eps), fx.asc) * 3600).toBeLessThan(1);
      expect(angSep(midheaven(fx.armc, fx.eps), fx.mc) * 3600).toBeLessThan(1);
    });
  }
});

describe('quadrant systems — structural invariants', () => {
  // Koch, Campanus, Regiomontanus and Sunshine have no reference cusps in the fixtures, but every
  // valid house ring must: open house 1 at the Asc and house 10 at the MC, keep opposite cusps 180°
  // apart, and advance monotonically around the zodiac (no 180° quadrant flips).
  const systems = ['koch', 'campanus', 'regiomontanus', 'sunshine'];
  const orientations = [[0, 44], [47, -20], [123, -0.18], [206.87, 40.71], [305, 63]];
  for (const sys of systems) {
    for (const [armc, lat] of orientations) {
      it(`${sys} @ armc=${armc},lat=${lat}: well-formed ring`, () => {
        const eps = 23.4392;
        const asc = ascendant(armc, lat, eps), mc = midheaven(armc, eps);
        const sunDec = -7; // only used by sunshine
        const c = houseCusps(sys, { armc, asc, mc, lat, eps, sunDec });
        expect(angSep(c[0], asc)).toBeLessThan(1e-6);         // cusp 1 = Asc
        expect(angSep(c[9], mc)).toBeLessThan(1e-6);          // cusp 10 = MC
        expect(angSep(c[3], (mc + 180) % 360)).toBeLessThan(1e-6);   // cusp 4 = IC
        expect(angSep(c[6], (asc + 180) % 360)).toBeLessThan(1e-6);  // cusp 7 = Dsc
        // Sunshine is a solar-arc system: only the angles are opposed, not the intermediate cusps.
        // The projective systems mirror opposite cusps exactly 180° apart.
        if (sys !== 'sunshine') {
          for (let i = 0; i < 6; i++) expect(angSep(c[i], c[i + 6])).toBeCloseTo(180, 6);
        }
        for (let i = 0; i < 12; i++) {
          const step = arc(c[i], c[(i + 1) % 12]);
          expect(step, `step ${i}`).toBeGreaterThan(0);
          expect(step).toBeLessThan(180);
        }
      });
    }
  }

  it("sunshine throws without the Sun's declination", () => {
    expect(() => houseCusps('sunshine', { armc: 100, asc: 10, mc: 280, lat: 40, eps: 23.44 }))
      .toThrow(/sunshine.*sunDec/);
  });

  it('HOUSE_SYSTEMS lists every system houseCusps computes', () => {
    const anchors = { armc: 100, lat: 40, eps: 23.44, sunDec: -7 };
    anchors.mc = midheaven(anchors.armc, anchors.eps);
    anchors.asc = ascendant(anchors.armc, anchors.lat, anchors.eps);
    for (const sys of HOUSE_SYSTEMS) expect(houseCusps(sys, anchors), sys).toHaveLength(12);
  });
});

describe('topocentric-progressive', () => {
  // Below the |lat| = 90 - 2*eps threshold the progressive pole equals the latitude, so cusps must
  // match standard Topocentric exactly. (Above it there is no reference cusp set to check against.)
  for (const chart of ['quito_2010', 'lowlat_1975']) {
    const fx = HOUSE_FIXTURES[chart];
    it(`${chart}: equals standard Topocentric below the pole threshold`, () => {
      expect(Math.abs(fx.lat)).toBeLessThan(90 - 2 * fx.eps);
      const params = { armc: fx.armc, asc: fx.asc, mc: fx.mc, lat: fx.lat, eps: fx.eps };
      const prog = houseCusps('topocentric-progressive', params);
      const topo = fx.systems.topocentric;
      for (let i = 0; i < 12; i++) expect(angSep(prog[i], topo[i]) * 3600).toBeLessThan(30);
    });
  }
  it('progressive pole bends only above the threshold', () => {
    const eps = 23.44;
    expect(progressivePole(20, eps)).toBe(20);          // below threshold: unchanged
    expect(progressivePole(-20, eps)).toBe(-20);
    expect(progressivePole(85, eps)).toBeLessThan(85);  // above threshold: pole reduced
    expect(progressivePole(85, eps)).toBeGreaterThan(0);
  });
});
