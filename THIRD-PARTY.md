# Third-party components

falcon-ephemeris is built from the permissively-licensed components below.

The core library (`src/`) depends only on **Astronomy Engine** at runtime. The
`falcon-ephemeris/chart` layer additionally uses **tz-lookup** (optional) to derive
a time zone from coordinates; all other chart functionality — sign logic, aspects,
angles, house cusps, ayanamshas, and timezone-offset resolution (via the platform's
built-in `Intl`) — is this project's own code with no third-party dependency.

## Bundled code

### Astronomy Engine — MIT
Sun, Moon, and planet positions.
Copyright (c) 2019-2025 Don Cross <cosinekitty@gmail.com>
https://github.com/cosinekitty/astronomy

### tz-lookup — CC0-1.0 (public domain)
Latitude/longitude to IANA timezone. Optional dependency of the `falcon-ephemeris/chart`
layer (lazy-imported only when a chart's time zone must be derived from coordinates; charts
given an explicit zone or a UTC date do not need it). Also bundled into the optional browser
bundle for the same purpose.
https://github.com/darkskyapp/tz-lookup

The MIT License text (applies to Astronomy Engine):

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

## Test reference data (facts, not code)

The house-cusp fixtures in `test/house-reference-swetest.js` are numeric output captured from
**swetest** (the Swiss Ephemeris command-line tool) by `build/gen-house-reference.mjs`, used purely
as black-box validation data — cusp longitudes are astronomical facts, not copyrightable code, and no
Swiss Ephemeris source is copied, linked, or distributed. swetest is not a build or runtime
dependency; regenerating the fixtures is optional and requires a locally-installed swetest.

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
