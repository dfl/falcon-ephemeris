// Glyph declutter for wheels and dials: given points on a circle, nudge overlapping ones apart while
// preserving their order, keeping each cluster centered on its members' mean position (or pinned to a
// ranked anchor). Ported from harmonic-explorer's wheel layout and generalized so each glyph can
// declare its own angular width — wide glyphs claim more room, narrow ones pack closer.

const norm360 = x => ((x % 360) + 360) % 360;

/**
 * Space a set of angular positions so neighbouring glyphs don't overlap.
 *
 * @param {{key:string, angle:number, width?:number}[]} items  Points to place (angle in degrees, any
 *   range). Optional per-item `width` is the glyph's angular footprint; items without one fall back to
 *   `gap` as their width, so a uniform `gap` reproduces the classic fixed-spacing behaviour. The
 *   minimum centre-to-centre separation of two neighbours is the mean of their widths.
 * @param {number} gap   Default angular width for items that don't specify one.
 * @param {Object<string,number>} [rank]  Optional priority per key: within a merged cluster the
 *   lowest-ranked key stays on its true angle and the others fill slots around it.
 * @returns {Object<string,number>} Map of key → display angle in [0, 360).
 */
export function spaceAngles(items, gap, rank = {}) {
  const out = {};
  if (items.length <= 1) {
    for (const it of items) out[it.key] = norm360(it.angle);
    return out;
  }
  const rankOf = k => (k in rank ? rank[k] : Infinity);
  const half = it => (it.width ?? gap) / 2;   // half the glyph's angular footprint
  const sorted = items
    .map(it => ({ key: it.key, lon: norm360(it.angle), h: half(it), rank: rankOf(it.key) }))
    .sort((a, b) => a.lon - b.lon);

  // Cut the circle at the widest gap between adjacent glyphs.
  let cut = 0, widest = -1;
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[(i + 1) % sorted.length];
    const g = norm360(next.lon - sorted[i].lon);
    if (g > widest) { widest = g; cut = (i + 1) % sorted.length; }
  }

  // Unwrap into a monotonically increasing line starting at the cut.
  const line = [];
  let prev = null;
  for (let k = 0; k < sorted.length; k++) {
    const it = sorted[(cut + k) % sorted.length];
    let x = it.lon;
    if (prev !== null) while (x < prev) x += 360;
    line.push({ key: it.key, want: x, h: it.h, rank: it.rank });
    prev = x;
  }

  // A cluster is a rigid chain: consecutive centres sit `h[i] + h[i+1]` apart. `offsets` gives each
  // member's position relative to the first; `anchor` slides the whole chain to best match the members'
  // desired angles (or pins it so a ranked glyph keeps its true angle).
  const layout = c => {
    const offsets = [0];
    for (let i = 1; i < c.length; i++) offsets.push(offsets[i - 1] + c[i - 1].h + c[i].h);
    let f = -1;
    for (let i = 0; i < c.length; i++) if (c[i].rank !== Infinity && (f < 0 || c[i].rank < c[f].rank)) f = i;
    let anchor;
    if (f >= 0) {
      anchor = c[f].want - offsets[f];
    } else {
      let s = 0;
      for (let i = 0; i < c.length; i++) s += c[i].want - offsets[i];
      anchor = s / c.length;
    }
    return { offsets, anchor };
  };

  const clusters = line.map(it => [it]);
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length - 1; i++) {
      const a = clusters[i], b = clusters[i + 1];
      const la = layout(a), lb = layout(b);
      const aRight = la.anchor + la.offsets[a.length - 1];   // centre of a's last glyph
      const bLeft = lb.anchor;                                // centre of b's first glyph
      if (bLeft - aRight < a[a.length - 1].h + b[0].h) {      // their footprints overlap
        clusters[i] = a.concat(b);
        clusters.splice(i + 1, 1);
        merged = true;
        break;
      }
    }
  }

  for (const c of clusters) {
    const { offsets, anchor } = layout(c);
    c.forEach((it, i) => { out[it.key] = norm360(anchor + offsets[i]); });
  }
  return out;
}
