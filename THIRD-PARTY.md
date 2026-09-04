# Third-party components

falcon-ephemeris is built from the permissively-licensed components below.

The core library (`src/`) depends only on **Astronomy Engine** at runtime. The
optional browser bundle (`build/regenerate.sh` → `dist/ephemeris.bundle.js`) also
includes a pinned, vendored copy of **CircularNatalHoroscopeJS** (`vendor/cnh/`)
for timezone/DST, sign logic, and the `Origin`/`Horoscope` convenience wrappers.

## Bundled code

### Astronomy Engine — MIT
Sun, Moon, and planet positions.
Copyright (c) 2019-2025 Don Cross <cosinekitty@gmail.com>
https://github.com/cosinekitty/astronomy

### CircularNatalHoroscopeJS — The Unlicense (public domain)
Timezone/DST derivation, house cusps, Ascendant/Midheaven, sign logic.
Vendored in `vendor/cnh/` (pinned to upstream commit `76e150f`, v1.1.0) with
modifications: its bundled ephemeris is replaced by our engine
(`src/ephemeris-mit.js`); Chiron/Sirius removed from the body list; a
seconds-handling fix in `hourTimeToDecimal`; precise obliquity/sidereal-time
anchors; added display labels. See `vendor/cnh/README.md` for the full list.
https://github.com/0xStarcat/CircularNatalHoroscopeJS

### moment and moment-timezone — MIT
Date/time and historical-timezone handling (build-time dep of the vendored CircularNatalHoroscopeJS).
Copyright (c) JS Foundation and other contributors
https://github.com/moment/moment

### tz-lookup — CC0-1.0 (public domain)
Latitude/longitude to IANA timezone (build-time dep of the vendored CircularNatalHoroscopeJS).
https://github.com/darkskyapp/tz-lookup

The MIT License text (applies to Astronomy Engine, moment, moment-timezone):

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
    IN THE SOFTWARE.

## Orbital element data (facts, not code)

The osculating elements used by `src/ephemeris-mit.js` to compute Eris and the
Uranian TNPs are numeric data, not copyrightable code:

- **Eris**: JPL Small-Body Database (NASA/JPL-Caltech, U.S. Government, public domain).
- **Ceres, Pallas, Juno, Vesta, Chiron**: osculating-element tables sampled from
  JPL Horizons (NASA/JPL-Caltech, U.S. Government, public domain); see
  `src/asteroid-elements.js` / `build/fetch-asteroids.sh`.
- **Uranian TNPs** (Cupido, Hades, Zeus, Kronos, Apollon, Admetos, Vulkanus,
  Poseidon): James Neely's published orbital elements for the hypothetical
  Uranian bodies (public-domain numeric data).
