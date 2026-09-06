import { describe, it, expect } from 'vitest';
import Ephemeris from '../src/ephemeris-mit.js';
import { EPOCHS, REFERENCE, TOLERANCE_ARCSEC } from './reference.js';

// Shortest angular separation between two longitudes, in degrees.
function angSep(a, b) {
  let d = ((a - b + 540) % 360) - 180;
  return Math.abs(d);
}

function longitudeOf(eph, key) {
  if (key === 'northnode') {
    return eph.Results.find((r) => r.key === 'moon').orbit.meanAscendingNode.apparentLongitude;
  }
  const r = eph.Results.find((x) => x.key === key);
  return r ? r.position.apparentLongitude : undefined;
}

describe('ephemeris longitudes vs reference', () => {
  for (const [label, args] of Object.entries(EPOCHS)) {
    const eph = new Ephemeris(args);
    const expected = REFERENCE[label];
    describe(label, () => {
      for (const [key, refLon] of Object.entries(expected)) {
        const tolDeg = (TOLERANCE_ARCSEC[key] ?? TOLERANCE_ARCSEC.default) / 3600;
        it(`${key} within ${TOLERANCE_ARCSEC[key] ?? TOLERANCE_ARCSEC.default}"`, () => {
          const got = longitudeOf(eph, key);
          expect(got, `${key} missing from Results`).toBeTypeOf('number');
          const errArcsec = angSep(got, refLon) * 3600;
          expect(errArcsec, `${key}: got ${got.toFixed(4)}, expected ${refLon} (err ${errArcsec.toFixed(1)}")`).toBeLessThan(tolDeg * 3600);
        });
      }
    });
  }
});

describe('ephemeris shim structure', () => {
  const eph = new Ephemeris(EPOCHS['1990-01-01T12:00:00Z']);
  it('exposes all expected body keys', () => {
    const keys = eph.Results.map((r) => r.key);
    for (const k of ['sun', 'moon', 'pluto', 'eris', 'ceres', 'chiron', 'kronos', 'poseidon']) {
      expect(keys, `missing ${k}`).toContain(k);
    }
  });
  it('provides the Moon mean node, descending node, and apogee', () => {
    const moon = eph.Results.find((r) => r.key === 'moon');
    expect(moon.orbit.meanAscendingNode.apparentLongitude).toBeTypeOf('number');
    expect(moon.orbit.meanDescendingNode.apparentLongitude).toBeTypeOf('number');
    expect(moon.orbit.meanApogee.apparentLongitude).toBeTypeOf('number');
  });
  it('provides the true node and interpolated apogee/perigee, near their mean counterparts', () => {
    const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    const moon = eph.Results.find((r) => r.key === 'moon').orbit;
    // True node librates within ~1.6° of the mean node; the interpolated apogee (stable) stays within
    // a few degrees of the mean apogee. Both true/interp fields are present and finite.
    expect(sep(moon.trueAscendingNode.apparentLongitude, moon.meanAscendingNode.apparentLongitude)).toBeLessThan(2);
    expect(sep(moon.trueApogee.apparentLongitude, moon.meanApogee.apparentLongitude)).toBeLessThan(8);
    expect(moon.truePerigee.apparentLongitude).toBeTypeOf('number');
  });
  it('flags retrograde motion as a boolean', () => {
    for (const r of eph.Results) expect(r.motion.isRetrograde).toBeTypeOf('boolean');
  });
});
