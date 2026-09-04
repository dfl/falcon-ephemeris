# Vendored: CircularNatalHoroscopeJS

A pinned, lightly-patched copy of [CircularNatalHoroscopeJS][upstream], used only by
the optional browser bundle (`build/regenerate.sh` → `dist/ephemeris.bundle.js`) for
timezone/DST derivation, sign logic, house cusps, and the `Origin`/`Horoscope`
convenience wrappers.

- **Upstream:** https://github.com/0xStarcat/CircularNatalHoroscopeJS
- **Pinned commit:** `76e150f64a3525797afe5b7ce118c2c63a1d59bd` (v1.1.0)
- **License:** The Unlicense (public domain) — see `LICENSE`.

Only the files actually reached by the bundle's dependency graph are vendored; the
upstream `lib/` ephemeris, tests, and tooling are intentionally omitted. Its own
ephemeris is replaced by this project's engine (`src/ephemeris-mit.js`), which is
**not** vendored here — `src/Horoscope.js` imports it from the repo's `src/`.

## Local modifications vs. upstream

These were previously applied at build time by `build/patch-cnh.js` (now removed);
they are baked into the vendored source. When re-syncing from upstream, re-apply:

1. **`src/Horoscope.js`** — import the ephemeris from this project's engine
   (`../../../src/ephemeris-mit.js`) instead of the bundled `lib/ephemeris-1.2.1.bundle`.
2. **`src/constants.js`** — drop `chiron` and `sirius` from `BODIES` (the shim doesn't
   provide Sirius; keeps default aspect generation from requiring them).
3. **`src/utilities/language.js`** — add en/es display labels for Eris, the major
   asteroids (Ceres/Pallas/Juno/Vesta), and the Uranian TNPs.
4. **`src/utilities/math.js`** — `hourTimeToDecimal` now honors `second` (angles/houses
   depend on it via sidereal time).
5. **`src/Horoscope.js`** — feed CircularNatal precise anchors: replace its fixed
   `23.4367` obliquity with the true obliquity of date and its sidereal time with
   Astronomy Engine's apparent sidereal time, so every house system and the Asc/MC
   match a JPL-DE reference to sub-arcsecond.

## Re-syncing

1. `git clone` upstream at the desired commit.
2. Copy the files listed under `src/` here over the vendored copies.
3. Re-apply the five modifications above (they will show up as conflicts/diffs, not
   silent no-ops — that's the point of vendoring instead of string-patching).
4. Update the pinned commit above and run `npm test` + `npm run bundle`.

[upstream]: https://github.com/0xStarcat/CircularNatalHoroscopeJS
