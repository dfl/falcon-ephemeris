import { describe, it, expect } from 'vitest';
import { houseCusps, HOUSE_SYSTEMS } from '../src/house-systems.js';
import { SWETEST_HOUSES } from './house-reference-swetest.js';

// Black-box validation against Swiss Ephemeris (swetest) output: feed swetest's own anchors
// (armc/asc/mc/eps, + the Sun's declination for Sunshine) into houseCusps and compare the 12 cusps
// to swetest's. swetest prints to 0.0001", so this is an exacting check of the house-division math.
// swetest has no Sripati or Topocentric-progressive, so those two are validated elsewhere.
const angSep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const TOL_ARCSEC = 1;

describe('house systems vs Swiss Ephemeris (swetest)', () => {
  for (const [name, fx] of Object.entries(SWETEST_HOUSES)) {
    const anchors = { armc: fx.armc, asc: fx.asc, mc: fx.mc, lat: fx.lat, eps: fx.eps, sunDec: fx.sunDec };
    describe(name, () => {
      for (const [system, ref] of Object.entries(fx.systems)) {
        it(`${system} — 12 cusps within ${TOL_ARCSEC}"`, () => {
          const got = houseCusps(system, anchors);
          expect(got, `${system} not computed`).toHaveLength(12);
          for (let i = 0; i < 12; i++) {
            const errArcsec = angSep(got[i], ref[i]) * 3600;
            expect(errArcsec, `${system} cusp ${i + 1}: got ${got[i].toFixed(5)}, swetest ${ref[i].toFixed(5)}`).toBeLessThan(TOL_ARCSEC);
          }
        });
      }
    });
  }

  it('covers every houseCusps system except the two swetest lacks', () => {
    const covered = new Set(Object.values(SWETEST_HOUSES).flatMap(fx => Object.keys(fx.systems)));
    const uncovered = HOUSE_SYSTEMS.filter(s => !covered.has(s));
    expect(uncovered.sort()).toEqual(['sripati', 'topocentric-progressive']);
  });
});
