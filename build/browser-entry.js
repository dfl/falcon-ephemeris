// Entry point for the optional browser bundle (esbuild → dist/ephemeris.bundle.js).
// Everything is this project's own src/. The chart layer bundles tz-lookup (its only external
// dependency) so coordinate→timezone lookup works in the browser; timezone offsets use the
// platform's built-in Intl.
export {
  chart, HOUSE_SYSTEMS, AYANAMSHAS,
  signOf, SIGNS, findAspects, ASPECTS, ayanamsha, resolveUTC,
  midpoint, midpoints, midpointPictures,
} from '../src/chart/index.js';
export { default as Ephemeris, obliquity, apparentSiderealTime } from '../src/ephemeris-mit.js';
export { houseCusps, ascendant, midheaven } from '../src/house-systems.js';
export { deltaTSeconds } from '../src/delta-t.js';
