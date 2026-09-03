#!/usr/bin/env bash
# Regenerate src/asteroid-elements.js from JPL Horizons (public-domain data).
# Osculating elements (heliocentric, J2000 ecliptic) at 180-day epochs, 1900-2100, for the
# major asteroids + Chiron. Runtime picks the nearest epoch and two-body-propagates the small
# remainder (a few arcsec), which perturbed main-belt bodies need across a wide date range.
set -euo pipefail
cd "$(dirname "$0")/../src"
declare -a IDS=(eris:136199 ceres:1 pallas:2 juno:3 vesta:4 chiron:2060)
for pair in "${IDS[@]}"; do
  name="${pair%%:*}"; id="${pair##*:}"
  echo "fetching $name ($id)..."
  curl -sS "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${id}%3B%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27ELEMENTS%27&CENTER=%27500@10%27&START_TIME=%271900-01-01%27&STOP_TIME=%272100-01-02%27&STEP_SIZE=%27180d%27&REF_PLANE=%27ECLIPTIC%27&REF_SYSTEM=%27J2000%27&OUT_UNITS=%27AU-D%27" -o "/tmp/hz_${name}.txt"
done
node -e '
const fs=require("fs");
const names=["eris","ceres","pallas","juno","vesta","chiron"];
function parse(txt){const body=txt.split("$$SOE")[1].split("$$EOE")[0];const lines=body.split("\n");const rows=[];
  for(let i=0;i<lines.length;i++){const m=lines[i].match(/^([0-9]+\.[0-9]+) = A\.D\./);if(!m)continue;
    const blk=" "+lines[i+1]+" "+lines[i+2]+" "+lines[i+3]+" "+lines[i+4]+" ";
    const g=re=>{const mm=blk.match(re);return mm?parseFloat(mm[1]):NaN;};
    const e=g(/EC=\s*([-0-9.E+]+)/),inc=g(/IN=\s*([-0-9.E+]+)/),om=g(/OM=\s*([-0-9.E+]+)/),
          w=g(/(?<![A-Za-z])W\s*=\s*([-0-9.E+]+)/),ma=g(/MA=\s*([-0-9.E+]+)/),a=g(/(?<![A-Za-z])A\s*=\s*([-0-9.E+]+)/);
    rows.push([Math.round((parseFloat(m[1])-2451545)*1e3)/1e3,+a.toFixed(8),+e.toFixed(9),+inc.toFixed(6),+om.toFixed(6),+w.toFixed(6),+ma.toFixed(6)]);}
  return rows;}
const obj={};for(const n of names){obj[n]=parse(fs.readFileSync("/tmp/hz_"+n+".txt","utf8"));}
const h="// Osculating elements (heliocentric, J2000 ecliptic) at 180-day epochs, 1900-2100, for the\n// major asteroids + Chiron, from JPL Horizons (public-domain data). Regenerate: build/fetch-asteroids.sh (writes src/).\n// Each row: [daysFromJ2000, a(AU), e, i(deg), node(deg), argPeri(deg), meanAnomaly(deg)].\n// Runtime picks the nearest epoch and two-body-propagates the <=90-day remainder (a few arcsec).\n";
const parts=names.map(n=>"  "+n+": [\n"+obj[n].map(r=>"    ["+r.join(",")+"]").join(",\n")+"\n  ]");
fs.writeFileSync("asteroid-elements.js",h+"export const ASTEROID_ELEMENTS = {\n"+parts.join(",\n")+"\n};\n");
for(const n of names)console.log(n,obj[n].length,"rows, a=",obj[n][200][1]);
console.log("bytes:",fs.statSync("asteroid-elements.js").size);'
