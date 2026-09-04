import { describe, it, expect } from 'vitest';
import { chart } from '../src/chart/index.js';
import { midpoint, midpoints, midpointPictures } from '../src/chart/midpoints.js';
import { findAspects } from '../src/chart/aspects.js';

const NY = { lat: 40.7128, lon: -74.0060 };
const UTC_1990 = new Date(Date.UTC(1990, 0, 1, 12, 0, 0));

describe('midpoints', () => {
  it('takes the near (short-arc) midpoint, wrapping 0°', () => {
    expect(midpoint(10, 110)).toBeCloseTo(60, 9);
    expect(midpoint(350, 10)).toBeCloseTo(0, 9);   // wraps, not 180
    expect(midpoint(10, 350)).toBeCloseTo(0, 9);   // symmetric
  });

  it('enumerates every unordered pair once', () => {
    const pts = [{ key: 'a', longitude: 0 }, { key: 'b', longitude: 90 }, { key: 'c', longitude: 180 }];
    const mps = midpoints(pts);
    expect(mps).toHaveLength(3);
    expect(mps.map(m => `${m.a}/${m.b}`).sort()).toEqual(['a/b', 'a/c', 'b/c']);
  });
});

describe('midpoint pictures (apex = a/b)', () => {
  // sun 0°, moon 90°  → midpoint 45°. mars at 45° is the direct apex; venus at 135° is on the 90°
  // dial (square the midpoint); jupiter at 225° is opposite (also on the 90°/180° dial).
  const pts = [
    { key: 'sun', longitude: 0 }, { key: 'moon', longitude: 90 },
    { key: 'mars', longitude: 45 }, { key: 'venus', longitude: 135 }, { key: 'jupiter', longitude: 225 },
  ];

  it('finds a direct apex on the 90° dial and labels the hard aspect', () => {
    const pics = midpointPictures(pts, { orb: 1, modulus: 90 });
    const m = pics.find(p => p.apex === 'mars' && [p.a, p.b].sort().join() === 'moon,sun');
    expect(m).toBeTruthy();
    expect(m.aspect).toBe('conjunction');
    expect(m.orb).toBeCloseTo(0, 9);
    expect(m.longitude).toBeCloseTo(45, 9);
  });

  it('square and opposition to the midpoint count on the 90° dial', () => {
    const pics = midpointPictures(pts, { orb: 1, modulus: 90 });
    const apexes = pics.filter(p => [p.a, p.b].sort().join() === 'moon,sun').map(p => [p.apex, p.aspect]);
    expect(apexes).toContainEqual(['venus', 'square']);
    expect(apexes).toContainEqual(['jupiter', 'opposition']);
  });

  it('modulus 360 keeps only the direct conjunction', () => {
    const pics = midpointPictures(pts, { orb: 1, modulus: 360 });
    const sunMoon = pics.filter(p => [p.a, p.b].sort().join() === 'moon,sun').map(p => p.apex);
    expect(sunMoon).toEqual(['mars']);   // venus (square) and jupiter (opposition) excluded
  });

  it('the apex is never a member of the pair', () => {
    const pics = midpointPictures(pts, { orb: 45, modulus: 90 });
    for (const p of pics) expect([p.a, p.b]).not.toContain(p.apex);
  });

  it('chart exposes midpoints only when requested', async () => {
    const off = await chart({ when: UTC_1990, place: NY });
    expect(off.midpoints).toEqual([]);
    const on = await chart({ when: UTC_1990, place: NY, midpoints: { orb: 1.5, modulus: 90 } });
    expect(on.midpoints.length).toBeGreaterThan(0);
    for (const m of on.midpoints) {
      expect(m).toHaveProperty('apex');
      expect(m.orb).toBeLessThanOrEqual(1.5);
    }
    // sorted tightest-orb first
    const orbs = on.midpoints.map(m => m.orb);
    expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
  });
});

describe('harmonic aspects', () => {
  it('detects aspects by harmonic with orb scaled as harmonicOrb / harmonic', () => {
    const pts = [
      { key: 'sun', longitude: 0 }, { key: 'trineish', longitude: 121 },   // 1° from 120 (h3)
      { key: 'quintileish', longitude: 72.4 },                             // 0.4° from 72 (h5)
      { key: 'septileish', longitude: 51.4 },                             // 0.03° from 360/7 (h7)
    ];
    const asp = findAspects(pts, { harmonics: [1, 2, 3, 4, 5, 6, 7], harmonicOrb: 8 });
    const by = k => asp.find(a => a.a === 'sun' && a.b === k);
    expect(by('trineish').aspect).toBe('trine');       // h3, tol 8/3 ≈ 2.67 → 1° in
    expect(by('quintileish').aspect).toBe('quintile');  // h5, tol 1.6 → 0.4° in
    expect(by('septileish').aspect).toBe('septile');    // h7, tol ≈1.14 → 0.03° in
  });

  it('rejects a harmonic aspect outside its (tighter) orb', () => {
    // 74° is 2° off the h5 quintile (72°); tolerance at h5 is 8/5 = 1.6°, so no aspect.
    const asp = findAspects([{ key: 'a', longitude: 0 }, { key: 'b', longitude: 74 }], { harmonics: [5], harmonicOrb: 8 });
    expect(asp).toHaveLength(0);
  });
});
