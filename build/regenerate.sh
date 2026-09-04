#!/usr/bin/env bash
# Regenerate dist/ephemeris.bundle.js — a self-contained IIFE global `AstroEphem` with
# { Origin, Horoscope, Ephemeris, obliquity, houseCusps, CUSTOM_HOUSE_SYSTEMS }.
#
# Sources are all in-tree and pinned: this project's engine (src/) plus a vendored,
# lightly-patched copy of CircularNatalHoroscopeJS (vendor/cnh — see its README for
# provenance and the local modifications). Its runtime deps (moment, moment-timezone,
# tz-lookup) are devDependencies here, so a plain `npm install` is enough — no clone,
# no build-time source rewriting.
set -euo pipefail
cd "$(dirname "$0")/.."          # repo root
mkdir -p dist
npx esbuild build/browser-entry.js \
  --bundle --format=iife --global-name=AstroEphem --minify \
  --outfile=dist/ephemeris.bundle.js
echo "wrote dist/ephemeris.bundle.js"
