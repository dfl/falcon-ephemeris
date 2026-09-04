#!/usr/bin/env bash
# Regenerate dist/ephemeris.bundle.js — a self-contained IIFE global `AstroEphem` with
# { chart, Ephemeris, houseCusps, ascendant, midheaven, obliquity, apparentSiderealTime,
#   HOUSE_SYSTEMS, AYANAMSHAS, signOf, findAspects, ayanamsha, deltaTSeconds, ... }.
#
# Sources are all in-tree: this project's engine and chart layer (src/). The only external
# dependency is tz-lookup (public-domain lat/lon→IANA zone), bundled in for the chart's
# coordinate-based timezone lookup; a plain `npm install` provides it.
set -euo pipefail
cd "$(dirname "$0")/.."          # repo root
mkdir -p dist
npx esbuild build/browser-entry.js \
  --bundle --format=iife --global-name=AstroEphem --minify \
  --outfile=dist/ephemeris.bundle.js
echo "wrote dist/ephemeris.bundle.js"
