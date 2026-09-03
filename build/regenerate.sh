#!/usr/bin/env bash
# Regenerate dist/ephemeris.bundle.js from source: CircularNatalHoroscopeJS (Unlicense) with its
# bundled ephemeris replaced by our engine (src/ephemeris-mit.js), which computes positions with
# Astronomy Engine (MIT) + a Kepler solver for Eris and the Uranian TNPs. Produces a self-contained
# IIFE global `AstroEphem`.
set -euo pipefail
cd "$(dirname "$0")/.."          # repo root
ROOT="$PWD"
mkdir -p dist
OUT="$ROOT/dist/ephemeris.bundle.js"
WORK="$(mktemp -d)"
echo "workdir: $WORK"
git clone --depth 1 https://github.com/0xStarcat/CircularNatalHoroscopeJS.git "$WORK/cnh"
cp "$ROOT/src/ephemeris-mit.js"     "$WORK/cnh/src/ephemeris-mit.js"
cp "$ROOT/src/asteroid-elements.js" "$WORK/cnh/src/asteroid-elements.js"
cp "$ROOT/src/house-systems.js"     "$WORK/cnh/src/house-systems.js"
cp "$ROOT/src/delta-t.js"           "$WORK/cnh/src/delta-t.js"
( cd "$WORK/cnh" && node "$ROOT/build/patch-cnh.js" )
( cd "$WORK/cnh" && npm install --no-audit --no-fund && npm install --no-save --no-audit --no-fund astronomy-engine esbuild )
printf "export { Origin, Horoscope } from './src/index.js';\nexport { default as Ephemeris, obliquity } from './src/ephemeris-mit.js';\nexport { houseCusps, CUSTOM_HOUSE_SYSTEMS } from './src/house-systems.js';\n" > "$WORK/cnh/browser-entry.js"
( cd "$WORK/cnh" && node -e "require('esbuild').build({entryPoints:['browser-entry.js'],bundle:true,format:'iife',globalName:'AstroEphem',minify:true,outfile:process.argv[1]})" "$OUT" )
echo "wrote $OUT"
