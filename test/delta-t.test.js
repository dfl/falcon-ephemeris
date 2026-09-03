import { describe, it, expect } from 'vitest';
import { deltaTSeconds } from '../src/delta-t.js';

const jdOfYear = y => 2451545.0 + (y - 2000) * 365.25;

describe('delta-T table (TT - UT)', () => {
  // Standard reference values (IERS observations for modern years; Espenak-Meeus for pre-1973), seconds.
  const KNOWN = { 1900: -2.8, 1950: 29.1, 2000: 63.83, 2010: 66.07, 2020: 69.36, 2025: 69.0 };
  for (const [year, expected] of Object.entries(KNOWN)) {
    it(`${year} ≈ ${expected}s`, () => {
      expect(Math.abs(deltaTSeconds(jdOfYear(+year)) - expected)).toBeLessThan(0.6);
    });
  }
  it('interpolates and extrapolates monotonically near present', () => {
    expect(deltaTSeconds(jdOfYear(2025.5))).toBeGreaterThan(68);
    expect(deltaTSeconds(jdOfYear(2200))).toBeGreaterThan(deltaTSeconds(jdOfYear(2100)));
  });
});
