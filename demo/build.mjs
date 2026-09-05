// Build a self-contained demo/build/index.html for static hosting (Cloudflare Pages): the demo page
// with the falcon-ephemeris browser bundle inlined in place of the ../dist/ <script src>. Run
// `npm run bundle` first so dist/ephemeris.bundle.js is current.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const html = readFileSync(new URL('harmonic-dial.html', here), 'utf8');
const bundle = readFileSync(new URL('../dist/ephemeris.bundle.js', here), 'utf8');

const out = html.split('<script src="../dist/ephemeris.bundle.js"></script>')
  .join('<script>/*falcon-ephemeris bundle*/\n' + bundle + '\n</script>');

if (out.includes('<script src=')) throw new Error('build still has an external <script src>');
mkdirSync(new URL('build/', here), { recursive: true });
writeFileSync(new URL('build/index.html', here), out);
console.log(`wrote demo/build/index.html — ${out.length} bytes, self-contained`);
