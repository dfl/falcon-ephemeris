import { describe, it, expect } from 'vitest';
import { houseCusps, progressivePole } from '../src/house-systems.js';
import { HOUSE_FIXTURES } from './house-reference.js';

function angSep(a, b) { let d = ((a - b + 540) % 360) - 180; return Math.abs(d); }

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
