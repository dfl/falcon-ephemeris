// Entry point for the optional browser bundle (esbuild → dist/ephemeris.bundle.js).
// Origin/Horoscope come from the vendored CircularNatalHoroscopeJS (vendor/cnh);
// the ephemeris engine and house systems are this project's own src/.
export { Origin, Horoscope } from '../vendor/cnh/src/index.js';
export { default as Ephemeris, obliquity } from '../src/ephemeris-mit.js';
export { houseCusps, CUSTOM_HOUSE_SYSTEMS } from '../src/house-systems.js';
