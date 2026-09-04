import { describe, it, expect } from 'vitest';
import { chart, HOUSE_SYSTEMS } from '../src/chart/index.js';
import { signOf } from '../src/chart/signs.js';
import { findAspects } from '../src/chart/aspects.js';
import { ayanamsha } from '../src/chart/ayanamsha.js';

const NY = { lat: 40.7128, lon: -74.0060 };
const UTC_1990 = new Date(Date.UTC(1990, 0, 1, 12, 0, 0));

describe('chart — deterministic UTC natal', () => {
  it('places the luminaries with correct sign, speed and house', async () => {
    const c = await chart({ when: UTC_1990, place: NY, houseSystem: 'placidus' });

    expect(c.bodies.sun.sign).toBe('capricorn');
    expect(c.bodies.sun.longitude).toBeCloseTo(280.814, 2);
    expect(c.bodies.sun.retrograde).toBe(false);
    expect(c.bodies.sun.speed).toBeGreaterThan(0.9);  // ~1°/day

    expect(c.bodies.moon.sign).toBe('pisces');
    expect(c.bodies.moon.speed).toBeGreaterThan(11);  // ~13°/day
    expect(c.bodies.moon.house).toBeGreaterThanOrEqual(1);
    expect(c.bodies.moon.house).toBeLessThanOrEqual(12);
  });

  it('gives the four angles, with descendant/IC opposite asc/mc', async () => {
    const { angles } = await chart({ when: UTC_1990, place: NY });
    const opp = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
    expect(opp(angles.ascendant.longitude, angles.descendant.longitude)).toBeCloseTo(180, 6);
    expect(opp(angles.midheaven.longitude, angles.imumCoeli.longitude)).toBeCloseTo(180, 6);
  });

  it('returns 12 house cusps with cusp 1 = ascendant', async () => {
    const c = await chart({ when: UTC_1990, place: NY, houseSystem: 'placidus' });
    expect(c.houses).toHaveLength(12);
    expect(c.houses[0].cusp).toBeCloseTo(c.angles.ascendant.longitude, 9);
    expect(c.houses[9].cusp).toBeCloseTo(c.angles.midheaven.longitude, 9);
  });

  it('marks the mean node retrograde and node/anti-node exactly opposed', async () => {
    const c = await chart({ when: UTC_1990, place: NY });
    expect(c.bodies.northNode.retrograde).toBe(true);
    expect(c.bodies.northNode.speed).toBeLessThan(0);
    const nn = c.aspects.find(a =>
      (a.a === 'northNode' && a.b === 'southNode') || (a.a === 'southNode' && a.b === 'northNode'));
    expect(nn?.aspect).toBe('opposition');
    expect(nn.orb).toBeCloseTo(0, 4);
  });

  it('supports every house system falcon exposes', async () => {
    for (const houseSystem of HOUSE_SYSTEMS) {
      const c = await chart({ when: UTC_1990, place: NY, houseSystem });
      expect(c.houses, houseSystem).toHaveLength(12);
    }
  });

  it('bodies:"all" includes asteroids and Uranian points', async () => {
    const c = await chart({ when: UTC_1990, place: NY, bodies: 'all' });
    expect(c.bodies.ceres).toBeTruthy();
    expect(c.bodies.eris).toBeTruthy();
    expect(c.bodies.cupido).toBeTruthy();
  });

  it('rejects an unknown house system', async () => {
    await expect(chart({ when: UTC_1990, place: NY, houseSystem: 'nope' })).rejects.toThrow(/unknown houseSystem/);
  });
});

describe('chart — timezone resolution (Intl, no moment)', () => {
  it('converts a local wall time to UTC using an explicit zone, honouring DST', async () => {
    // 09:30 London in July is BST (UTC+1) → 08:30 UTC.
    const c = await chart({ when: '1985-07-13T09:30:00', place: { lat: 51.5, lon: -0.13 }, zone: 'Europe/London' });
    expect(c.meta.utc).toBe('1985-07-13T08:30:00.000Z');
    expect(c.meta.zone).toBe('Europe/London');
  });

  it('treats a Date as a UTC instant and needs no zone', async () => {
    const c = await chart({ when: UTC_1990, place: NY });
    expect(c.meta.utc).toBe('1990-01-01T12:00:00.000Z');
  });
});

describe('sidereal zodiac (ayanamsha)', () => {
  it('matches published ayanamsha values', () => {
    // Lahiri ≈ 23.86° at J2000, ≈ 24.19° at 2024; Fagan–Bradley is ≈ 0.883° larger.
    expect(ayanamsha(2451545.0, 'lahiri')).toBeCloseTo(23.857, 2);
    expect(ayanamsha(2460310.5, 'lahiri')).toBeCloseTo(24.192, 2);
    expect(ayanamsha(2451545.0, 'fagan-bradley') - ayanamsha(2451545.0, 'lahiri')).toBeCloseTo(0.8832, 4);
  });

  it('shifts longitudes by the ayanamsha but leaves houses and aspects invariant', async () => {
    const opts = { when: UTC_1990, place: NY };
    const trop = await chart({ ...opts });
    const sid = await chart({ ...opts, zodiac: 'sidereal', ayanamsha: 'lahiri' });
    const shift = (((trop.bodies.sun.longitude - sid.bodies.sun.longitude) % 360) + 360) % 360;
    expect(shift).toBeCloseTo(sid.meta.ayanamsha.value, 9);
    expect(sid.meta.ayanamsha.mode).toBe('lahiri');
    expect(sid.meta.zodiac).toBe('sidereal');
    // Same physical sky → same house placement and same aspects.
    expect(sid.bodies.sun.house).toBe(trop.bodies.sun.house);
    expect(sid.aspects).toEqual(trop.aspects);
  });

  it('tropical chart carries no ayanamsha', async () => {
    const c = await chart({ when: UTC_1990, place: NY });
    expect(c.meta.zodiac).toBe('tropical');
    expect(c.meta.ayanamsha).toBeNull();
  });

  it('rejects an unknown zodiac or ayanamsha mode', async () => {
    await expect(chart({ when: UTC_1990, place: NY, zodiac: 'galactic' })).rejects.toThrow(/zodiac/);
    await expect(chart({ when: UTC_1990, place: NY, zodiac: 'sidereal', ayanamsha: 'nope' })).rejects.toThrow(/unknown mode/);
  });
});

describe('signs & aspects helpers', () => {
  it('signOf resolves sign, degrees and decan', () => {
    const s = signOf(125.5); // 5.5° Leo
    expect(s.sign).toBe('leo');
    expect(s.degreesInSign).toBeCloseTo(5.5, 6);
    expect(s.decan).toBe(1);
  });

  it('findAspects flags applying from relative speed', () => {
    // Two points 118° apart heading toward an exact 120° trine.
    const asp = findAspects([
      { key: 'a', longitude: 0, speed: 0 },
      { key: 'b', longitude: 118, speed: 1 },  // b pulling away → separation grows toward 120
    ]);
    const trine = asp.find(x => x.aspect === 'trine');
    expect(trine).toBeTruthy();
    expect(trine.applying).toBe(true);
  });
});
