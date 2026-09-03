#!/usr/bin/env bash
# Regenerate src/delta-t.js. Delta-T (TT - UT) is a public-domain Earth-rotation quantity. Modern
# years come from IERS Earth Orientation data (UT1-UTC in finals.all plus the leap-second table);
# historical and far-future years from the Espenak-Meeus polynomial expressions. No runtime deps.
set -euo pipefail
cd "$(dirname "$0")/.."
FINALS="/tmp/finals.all"
echo "fetching IERS finals.all..."
curl -sS -m 60 "https://datacenter.iers.org/data/latestVersion/finals.all.iau2000.txt" -o "$FINALS"
node build/gen-deltat.cjs "$FINALS"
