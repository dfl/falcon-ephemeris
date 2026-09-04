# falcon-ephemeris

A **dual-licensed** (AGPL-3.0-or-later, or commercial) astrology ephemeris for
JavaScript. It computes geocentric
ecliptic longitudes for the Sun through Pluto and the Moon, the lunar nodes, Black
Moon Lilith / Priapus, Eris, the major asteroids, Chiron, and the eight Uranian
TNPs — plus Ascendant, Midheaven, and house cusps for the common house systems, in
tropical or sidereal (Fagan–Bradley) zodiac.

The `src/` library has a single runtime dependency:
**[Astronomy Engine](https://github.com/cosinekitty/astronomy)**.

## Highlights

- **Sub-arcsecond angles and house cusps.** The Ascendant, Midheaven, and every
  house system are computed from apparent sidereal time and the true obliquity of
  date (Astronomy Engine `e_tilt`), matching a JPL-DE reference to sub-arcsecond.
- **House systems:** Placidus, Porphyry, Sripati, Meridian (axial), Morinus,
  Vehlow, Alcabitius, and a topocentric–progressive variant.
- **Corrected ΔT (TT − UT)** from a bundled IERS + Stephenson–Morrison–Hohenkerk
  table (`src/delta-t.js`), since Astronomy Engine's built-in prediction is stale
  for the 2020s (~3″ on the Moon).
- **Seconds-precision time** throughout, so sidereal time and the angles honour the
  seconds field.
- **Extra bodies** with a full apparent-place reduction (Vondrák long-term
  precession, iterated light-time, gravitational deflection, annual aberration):
  Eris, Ceres, Pallas, Juno, Vesta, and Chiron from a bundled JPL Horizons
  osculating-element table; the eight Uranian TNPs (Cupido, Hades, Zeus, Kronos,
  Apollon, Admetos, Vulkanus, Poseidon) from the fixed Neely elements.
- **True (osculating) lunar node** from the Moon's state vector, alongside the mean
  node; **Black Moon Lilith / Priapus** (mean apogee / perigee); **sidereal**
  (Fagan–Bradley) alongside tropical.

## Install

```bash
npm install falcon-ephemeris
```

## Usage

```js
import { Ephemeris, houseCusps, obliquity, apparentSiderealTime } from 'falcon-ephemeris';

// Ecliptic longitudes for a moment + place.
const eph = new Ephemeris({
  year: 1990, month: 0, day: 1,      // month is 0-based
  hour: 12, minute: 0, second: 0,    // UTC
  latitude: 40.7128, longitude: -74.0060,
});
const sun = eph.Results.find(r => r.key === 'sun');
console.log(sun.position.apparentLongitude);   // → 280.30…
```

`houseCusps` is a pure trig routine: you supply the anchors and it returns the 12
cusp longitudes. `armc` (the RA of the MC) comes from local apparent sidereal
time, and `asc`/`mc` are the ecliptic longitudes of the Ascendant/Midheaven —
`obliquity` and `apparentSiderealTime` give you the pieces:

```js
const date = new Date(Date.UTC(1990, 0, 1, 12));
const eps = obliquity(date);                             // true obliquity of date
const armc = apparentSiderealTime(date, longitude);      // → RA of the MC
// derive asc/mc from armc, lat, eps (or take them from the browser bundle's Horoscope), then:
const cusps = houseCusps('placidus', { armc, asc, mc, lat, eps });
```

For a batteries-included path (birth data in → chart with houses and angles out),
use the `Horoscope` wrapper from the [browser bundle](#browser-bundle-optional).

### Exports

| Export | From | Purpose |
| --- | --- | --- |
| `Ephemeris` (default) | `src/ephemeris-mit.js` | Body longitudes, speeds, retrograde, nodes, apogee |
| `obliquity(date)` | `src/ephemeris-mit.js` | True obliquity of date (deg) |
| `apparentSiderealTime(date, lon)` | `src/ephemeris-mit.js` | Local apparent sidereal time (deg) |
| `houseCusps(system, anchors)` | `src/house-systems.js` | Cusp longitudes for one system |
| `CUSTOM_HOUSE_SYSTEMS` | `src/house-systems.js` | List of supported systems |
| `deltaTSeconds(jdUt)` | `src/delta-t.js` | Corrected ΔT (TT − UT) in seconds |
| `ASTEROID_ELEMENTS` | `src/asteroid-elements.js` | Osculating-element table |

## Accuracy

Versus a JPL-DE reference ephemeris:

- **Planets** — a few arcsec; **Moon** and **mean node** sub-arcsec to ~12″.
- **TNPs** — ~0.4″.
- **Eris, asteroids, Chiron** — ~1″ (larger only for Eris well before its 2005
  discovery, where orbit solutions themselves diverge).
- **Angles and house cusps** — **sub-arcsecond**; computed from apparent sidereal
  time and the true obliquity of date, independent of the body ephemeris.

The vitest suite (`test/`) pins every body's longitude against reference values at
two epochs, within per-body arcsecond tolerances.

```bash
npm install
npm test
```

## Browser bundle (optional)

For a self-contained IIFE that also exposes `Origin` / `Horoscope` (timezone, DST,
sign logic from [CircularNatalHoroscopeJS](https://github.com/0xStarcat/CircularNatalHoroscopeJS)),
regenerate `dist/ephemeris.bundle.js`:

```bash
npm install            # once, to pull the bundle's build-time deps
npm run bundle         # esbuild build/browser-entry.js → dist/ephemeris.bundle.js
```

This produces a global `AstroEphem` with `{ Origin, Horoscope, Ephemeris,
obliquity, houseCusps, CUSTOM_HOUSE_SYSTEMS }`.

The build has no network step: `Origin`/`Horoscope` come from a pinned, vendored
copy of CircularNatalHoroscopeJS in [`vendor/cnh/`](./vendor/cnh/README.md) (its
own ephemeris replaced by this project's engine, plus a few small patches recorded
in that directory's README), and the rest is this project's own `src/`.

## Regenerating the data tables

Both tables are numeric facts (public domain), regenerated from source:

```bash
./build/fetch-asteroids.sh   # JPL Horizons → src/asteroid-elements.js
./build/fetch-deltat.sh      # IERS ΔT observations → src/delta-t.js
```

## License

**Dual-licensed:** AGPL-3.0-or-later for open-source use (see [`LICENSE`](./LICENSE)),
or a commercial/permissive license by arrangement. See [`LICENSING.md`](./LICENSING.md)
for details. Third-party components are listed in [`THIRD-PARTY.md`](./THIRD-PARTY.md).
