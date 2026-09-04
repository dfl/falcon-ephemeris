// Smoke test for the vendored CircularNatalHoroscopeJS graph (vendor/cnh) — the same
// module graph the browser bundle is built from. Exercises Origin + Horoscope end to end
// so a broken vendor copy, a stale import path, or a bad esbuild input fails here
// instead of silently shipping in dist/ephemeris.bundle.js.
import { describe, it, expect } from 'vitest';
import { Origin, Horoscope } from '../vendor/cnh/src/index.js';

// 1990-01-01 12:00 local, New York City.
const origin = new Origin({
  year: 1990, month: 0, date: 1, hour: 12, minute: 0,
  latitude: 40.7128, longitude: -74.006,
});
const h = new Horoscope({ origin, houseSystem: 'placidus', zodiac: 'tropical' });

describe('vendored Horoscope', () => {
  it('places the Sun in Capricorn (~11°)', () => {
    const sun = h.CelestialBodies.sun;
    expect(sun.Sign.label).toBe('Capricorn');
    expect(sun.ChartPosition.Ecliptic.DecimalDegrees).toBeGreaterThan(280);
    expect(sun.ChartPosition.Ecliptic.DecimalDegrees).toBeLessThan(282);
  });

  it('computes a plausible Ascendant and 12 house cusps', () => {
    const asc = h.Ascendant.ChartPosition.Ecliptic.DecimalDegrees;
    expect(asc).toBeTypeOf('number');
    expect(asc).toBeGreaterThanOrEqual(0);
    expect(asc).toBeLessThan(360);
    expect(h.Houses).toHaveLength(12);
  });

  it('exposes the Eris/TNP labels added by the local patch', () => {
    // language.js patch: these labels must survive re-syncs.
    const eris = h.CelestialBodies.all.find((b) => b.key === 'eris');
    expect(eris, 'eris missing from CelestialBodies').toBeTruthy();
    expect(eris.label).toBe('Eris');
  });
});
