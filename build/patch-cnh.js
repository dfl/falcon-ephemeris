// Applied by regenerate.sh against a fresh CircularNatalHoroscopeJS clone (public-domain / Unlicense).
// Swaps its bundled ephemeris for our engine (src/ephemeris-mit.js, copied into the clone by
// regenerate.sh), and makes the small adjustments the engine needs.
const fs = require("fs");

// 1) Point Horoscope at our engine instead of the bundled one.
const hPath = "src/Horoscope.js";
fs.writeFileSync(hPath, fs.readFileSync(hPath, "utf8")
  .replace("import Ephemeris from '../lib/ephemeris-1.2.1.bundle'", "import Ephemeris from './ephemeris-mit'"));

// 2) The shim doesn't provide Chiron/Sirius (unused here); drop them from BODIES so default
//    aspect generation doesn't require them.
const cPath = "src/constants.js";
fs.writeFileSync(cPath, fs.readFileSync(cPath, "utf8").replace(
  "  'pluto': {\n    label: 'Pluto'\n  },\n  'chiron': {\n    label: 'Chiron'\n  },\n  'sirius': {\n    label: 'Sirius'\n  }\n}",
  "  'pluto': {\n    label: 'Pluto'\n  }\n}"));

// 3) Display labels for Eris + the Uranian TNPs (en + es).
const lPath = "src/utilities/language.js";
let l = fs.readFileSync(lPath, "utf8");
const extra = ["eris: 'Eris'", "ceres: 'Ceres'", "pallas: 'Pallas'", "juno: 'Juno'", "vesta: 'Vesta'", "cupido: 'Cupido'", "hades: 'Hades'", "zeus: 'Zeus'", "kronos: 'Kronos'", "apollon: 'Apollon'", "admetos: 'Admetos'", "vulkanus: 'Vulkanus'", "poseidon: 'Poseidon'"]
  .map(s => "    " + s + ",").join("\n");
l = l.replace("    chiron: 'Chiron',", () => "    chiron: 'Chiron',\n" + extra);
l = l.replace("    chiron: 'Quirón',", () => "    chiron: 'Quirón',\n" + extra);
fs.writeFileSync(lPath, l);

// 4) Fix hourTimeToDecimal to honor seconds (angles/houses use it via sidereal time).
const mPath = "src/utilities/math.js";
fs.writeFileSync(mPath, fs.readFileSync(mPath, "utf8").replace(
  "export const hourTimeToDecimal = ({ hour = 0, minute = 0 } = {}) =>\n  // HH:MM time format => Float\n  // ex: 1:30 => 1.5\n  // ex: 23.25 => 23.25\n  moment.duration(`${hour}:${minute}`).asHours();",
  () => "export const hourTimeToDecimal = ({ hour = 0, minute = 0, second = 0 } = {}) =>\n  // HH:MM:SS time format => Float\n  hour + minute / 60 + second / 3600;"));

console.log("patched CircularNatal for the MIT shim");

// 5) Feed CircularNatal precise anchors so ALL its house systems and the Asc/MC match a JPL-DE
//    reference to sub-arcsec: replace its sidereal-time with Astronomy Engine's apparent sidereal
//    time, and its fixed 23.4367 obliquity with the true obliquity of date.
{
  const hp = "src/Horoscope.js";
  let h = fs.readFileSync(hp, "utf8");
  h = h.replace(
    "import Ephemeris from './ephemeris-mit'",
    "import Ephemeris, { obliquity as trueObliquity, apparentSiderealTime } from './ephemeris-mit'");
  // Compute precise anchors just before the angles/houses are built.
  h = h.replace(
    "    this._ascendant = this.createAscendant();",
    "    { const _u = this.origin.utcTime, _d = new Date(Date.UTC(_u.year(), _u.month(), _u.date(), _u.hour(), _u.minute(), _u.second()));\n" +
    "      this._trueObliquity = trueObliquity(_d);\n" +
    "      this.origin.localSiderealTime = apparentSiderealTime(_d, parseFloat(this.origin.longitude)); }\n" +
    "    this._ascendant = this.createAscendant();");
  // Pass the true obliquity everywhere latitude is passed (Ascendant + every quadrant house system).
  h = h.split("latitude: this.origin.latitude,").join("latitude: this.origin.latitude, obliquityEcliptic: this._trueObliquity,");
  // Midheaven takes no latitude; patch it explicitly.
  h = h.replace(
    "getMidheavenSun({ localSiderealTime: this.origin.localSiderealTime })",
    "getMidheavenSun({ localSiderealTime: this.origin.localSiderealTime, obliquityEcliptic: this._trueObliquity })");
  fs.writeFileSync(hp, h);
  console.log("patched Horoscope for precise anchors:", h.includes("apparentSiderealTime") && h.includes("this._trueObliquity"));
}
