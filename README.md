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
import { Ephemeris, houseCusps, ascendant, midheaven, obliquity, apparentSiderealTime } from 'falcon-ephemeris';

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
time; `ascendant` and `midheaven` give you the `asc`/`mc` anchors as closed-form
`atan2` (robust in both hemispheres and at high latitude). `obliquity`,
`apparentSiderealTime`, `ascendant`, and `midheaven` give you every piece:

```js
const date = new Date(Date.UTC(1990, 0, 1, 12));
const eps = obliquity(date);                             // true obliquity of date
const armc = apparentSiderealTime(date, longitude);      // → RA of the MC
const mc = midheaven(armc, eps);
const asc = ascendant(armc, lat, eps);
const cusps = houseCusps('placidus', { armc, asc, mc, lat, eps });
```

### Chart (`falcon-ephemeris/chart`)

For a batteries-included path — birth data in, a full chart out — use the modern
`chart()` layer. One async call returns a frozen plain-data object: every body with
its sign, house, and speed; the four angles; house cusps for any system; and
aspects. Local wall-clock times are resolved to UTC from the birth place's time
zone using the platform's built-in `Intl` (no `moment`); zone lookup from lat/lon
uses the optional `tz-lookup` dependency.

```js
import { chart } from 'falcon-ephemeris/chart';

const c = await chart({
  when: '1990-01-01T12:00:00',            // local wall time (or a Date for UTC)
  place: { lat: 40.7128, lon: -74.0060 }, // zone derived from lat/lon…
  zone: 'America/New_York',               // …or pass one explicitly
  houseSystem: 'placidus',                // any of HOUSE_SYSTEMS
  bodies: 'all',                          // or a subset; default is a common set
  zodiac: 'sidereal',                     // default 'tropical'
  ayanamsha: 'lahiri',                    // or 'fagan-bradley' (sidereal only)
  midpoints: { orb: 1.5, modulus: 90 },   // opt-in; omit for none
});

c.bodies.sun;        // { longitude, sign, degreesInSign, decan, speed, retrograde, house, … }
c.angles.ascendant;  // { longitude, sign, degreesInSign, … }  (+ midheaven/descendant/imumCoeli)
c.houses[0];         // { house: 1, cusp, sign, degreesInSign, … }
c.aspects[0];        // { a, b, aspect, angle, orb, applying }  — tightest first
c.midpoints[0];      // { apex, a, b, aspect, longitude, orb }  — "apex = a/b" pictures
c.meta;              // { utc, zone, julianDay, deltaT, obliquity, siderealTime, houseSystem, … }
```

`chart` exports `signOf`, `SIGNS`, `findAspects`, `ASPECTS`, `midpoint`, `midpoints`,
`midpointPictures`, `resolveUTC`, `ayanamsha`, `AYANAMSHAS`, and `HOUSE_SYSTEMS`.

`HOUSE_SYSTEMS` covers Placidus, Koch, Campanus, Regiomontanus, Porphyry, Sripati,
Meridian, Morinus, Vehlow, Equal, Whole-sign, Alcabitius, Topocentric,
Topocentric-progressive, and Sunshine — validated cusp-for-cusp against Swiss
Ephemeris (`swetest`) to sub-arcsecond. For a `sidereal` chart, longitudes, angles,
and cusps are shifted by the Lahiri or Fagan–Bradley ayanamsha; house membership and
aspect angles are unaffected.

**Aspects & midpoints.** `findAspects` runs a fixed table (Ptolemaic by default,
`minors: true` to add the rest) or a harmonic sweep (`harmonics: [1,2,3,4,6]`, orb
scaled as `harmonicOrb / harmonic`). The degenerate opposition between an axis pair
(nodes, Asc/Desc, MC/IC) is suppressed unless `redundant: true`. `midpointPictures`
finds cosmobiology "apex = a/b" pictures on a modulus dial — `modulus: 90` (the
default) counts conjunction, square, and opposition to a midpoint; `45` adds the
semisquare octave; `180`/`360` narrow it.

### Exports

| Export | From | Purpose |
| --- | --- | --- |
| `Ephemeris` (default) | `src/ephemeris-mit.js` | Body longitudes, speeds, retrograde, nodes, apogee |
| `obliquity(date)` | `src/ephemeris-mit.js` | True obliquity of date (deg) |
| `apparentSiderealTime(date, lon)` | `src/ephemeris-mit.js` | Local apparent sidereal time (deg) |
| `houseCusps(system, anchors)` | `src/house-systems.js` | Cusp longitudes for one system |
| `ascendant(armc, lat, eps)` | `src/house-systems.js` | Ascendant ecliptic longitude (closed form) |
| `midheaven(armc, eps)` | `src/house-systems.js` | Midheaven ecliptic longitude (closed form) |
| `HOUSE_SYSTEMS` | `src/house-systems.js` | Every system `houseCusps` computes |
| `deltaTSeconds(jdUt)` | `src/delta-t.js` | Corrected ΔT (TT − UT) in seconds |
| `ASTEROID_ELEMENTS` | `src/asteroid-elements.js` | Osculating-element table |
| `chart(options)` | `src/chart/index.js` | Full natal chart (subpath `falcon-ephemeris/chart`) |

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

For a self-contained IIFE, regenerate `dist/ephemeris.bundle.js`:

```bash
npm install            # once, to pull the bundle's build-time deps
npm run bundle         # esbuild build/browser-entry.js → dist/ephemeris.bundle.js
```

This produces a global `AstroEphem` exposing `chart` and the rest of the chart layer
(`signOf`, `findAspects`, `ayanamsha`, `HOUSE_SYSTEMS`, …) plus the core `Ephemeris`,
`houseCusps`, `ascendant`, `midheaven`, `obliquity`, and `apparentSiderealTime`. The
bundle inlines `tz-lookup` so coordinate-based timezone resolution works in the
browser:

```js
const c = await AstroEphem.chart({
  when: '1990-01-01T12:00:00',            // local wall time at the birth place
  place: { lat: 40.7128, lon: -74.0060 }, // timezone + DST derived from coordinates
  houseSystem: 'placidus',
});
c.bodies.sun.sign;                 // → 'capricorn'
c.angles.ascendant.longitude;      // → 274.64
c.houses[0].sign;                  // → 'capricorn' (1st-house cusp)
```

The build has no network step and everything is this project's own `src/` (plus the
public-domain `tz-lookup`).

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
