import { describe, it, expect } from 'vitest';
import { spaceAngles } from '../src/chart/layout.js';
import { chart } from '../src/chart/index.js';

const norm = x => ((x % 360) + 360) % 360;
const sep = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return Math.min(d, 360 - d); };

describe('spaceAngles', () => {
  it('leaves already-separated glyphs untouched', () => {
    const out = spaceAngles([{ key: 'a', angle: 0 }, { key: 'b', angle: 120 }, { key: 'c', angle: 240 }], 9);
    expect(out.a).toBeCloseTo(0, 6);
    expect(out.b).toBeCloseTo(120, 6);
    expect(out.c).toBeCloseTo(240, 6);
  });

  it('pushes a tight cluster apart to at least the gap, centered on their mean', () => {
    const out = spaceAngles([{ key: 'a', angle: 99 }, { key: 'b', angle: 100 }, { key: 'c', angle: 101 }], 9);
    const xs = [out.a, out.b, out.c].sort((p, q) => p - q);
    expect(sep(xs[0], xs[1])).toBeGreaterThanOrEqual(9 - 1e-6);
    expect(sep(xs[1], xs[2])).toBeGreaterThanOrEqual(9 - 1e-6);
    // mean preserved (100), order preserved
    expect((out.a + out.b + out.c) / 3).toBeCloseTo(100, 6);
    expect(out.a).toBeLessThan(out.b);
    expect(out.b).toBeLessThan(out.c);
  });

  it('handles the wrap seam (cluster straddling 0°)', () => {
    const out = spaceAngles([{ key: 'a', angle: 358 }, { key: 'b', angle: 0 }, { key: 'c', angle: 2 }], 9);
    const xs = [out.a, out.b, out.c];
    for (let i = 0; i < xs.length; i++)
      for (let j = i + 1; j < xs.length; j++)
        expect(sep(xs[i], xs[j])).toBeGreaterThanOrEqual(9 - 1e-6);
  });

  it('pins a ranked glyph to its true angle within a cluster', () => {
    // b is ranked (0), so it stays put; a and c fill slots around it.
    const out = spaceAngles([{ key: 'a', angle: 99 }, { key: 'b', angle: 100 }, { key: 'c', angle: 101 }], 10, { b: 0 });
    expect(out.b).toBeCloseTo(100, 6);
    expect(out.a).toBeCloseTo(90, 6);
    expect(out.c).toBeCloseTo(110, 6);
  });

  it('is a no-op for zero or one item', () => {
    expect(spaceAngles([], 9)).toEqual({});
    expect(spaceAngles([{ key: 'x', angle: 370 }], 9)).toEqual({ x: 10 });
  });

  it('honours per-item widths: neighbours separate by the mean of their footprints', () => {
    // a is wide (20°), b and c are narrow (4°). Overlapping cluster around 100°.
    const out = spaceAngles([
      { key: 'a', angle: 98, width: 20 }, { key: 'b', angle: 100, width: 4 }, { key: 'c', angle: 102, width: 4 },
    ], 9);
    const gapAB = Math.abs(out.b - out.a), gapBC = Math.abs(out.c - out.b);
    expect(gapAB).toBeGreaterThanOrEqual((20 + 4) / 2 - 1e-6);   // wide a pushes b away
    expect(gapBC).toBeGreaterThanOrEqual((4 + 4) / 2 - 1e-6);    // the two narrow ones pack close
    expect(out.a).toBeLessThan(out.b);
    expect(out.b).toBeLessThan(out.c);
  });

  it('a narrow-glyph cluster packs tighter than a uniform gap would', () => {
    const narrow = spaceAngles([
      { key: 'a', angle: 99, width: 3 }, { key: 'b', angle: 100, width: 3 }, { key: 'c', angle: 101, width: 3 },
    ], 12);
    expect(Math.abs(narrow.c - narrow.a)).toBeCloseTo(6, 6);     // 2 gaps of width 3, not 24
  });
});

describe('Aries Point body', () => {
  it('is available and sits at 0° tropical', async () => {
    const c = await chart({ when: new Date(Date.UTC(2000, 0, 1, 12)), place: { lat: 40, lon: -74 }, bodies: ['ariesPoint', 'sun'] });
    expect(c.bodies.ariesPoint.longitude).toBeCloseTo(0, 9);
    expect(c.bodies.ariesPoint.sign).toBe('aries');
  });

  it('carries the ayanamsha in a sidereal chart', async () => {
    const c = await chart({ when: new Date(Date.UTC(2000, 0, 1, 12)), place: { lat: 40, lon: -74 }, bodies: ['ariesPoint'], zodiac: 'sidereal', ayanamsha: 'lahiri' });
    // Tropical 0° in the sidereal frame = −ayanamsha (≈ 336.1° for Lahiri at J2000).
    expect(c.bodies.ariesPoint.longitude).toBeCloseTo(norm(-c.meta.ayanamsha.value), 6);
  });
});
