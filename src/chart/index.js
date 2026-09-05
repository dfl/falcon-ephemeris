// phoenix-chart — a fresh, modern natal-chart layer over falcon-ephemeris. One async function in,
// one frozen plain-data chart out: bodies with sign/house/speed, the four angles, house cusps for
// any system falcon supports, and aspects. Depends only on falcon's own src/ plus tz-lookup.

import Ephemeris, { obliquity, apparentSiderealTime } from '../ephemeris-mit.js';
import { houseCusps, ascendant, midheaven, vertex, HOUSE_SYSTEMS } from '../house-systems.js';
import { deltaTSeconds } from '../delta-t.js';
import { signOf } from './signs.js';
import { findAspects } from './aspects.js';
import { midpointPictures } from './midpoints.js';
import { resolveUTC } from './timezone.js';
import { ayanamsha as ayanamshaOf } from './ayanamsha.js';

const norm360 = x => ((x % 360) + 360) % 360;
const norm180 = x => { const v = norm360(x); return v > 180 ? v - 360 : v; };
const HALF_DAY_MS = 43_200_000;

// Points computed from the Moon's orbit rather than as bodies in their own right.
const DERIVED = ['northNode', 'southNode', 'lilith', 'priapus'];
// A sensible default body set; pass `bodies: 'all'` for every point falcon computes.
export const DEFAULT_BODIES = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'northNode', 'southNode', 'lilith',
];

export { HOUSE_SYSTEMS };

// Longitudes of every point (ephemeris bodies + Moon-orbit derivations) in one Ephemeris instance.
function pointLongitudes(eph) {
  const m = {};
  for (const r of eph.Results) m[r.key] = r.position.apparentLongitude;
  const moon = eph.Results.find(r => r.key === 'moon');
  if (moon?.orbit) {
    m.northNode = moon.orbit.meanAscendingNode.apparentLongitude;
    m.southNode = moon.orbit.meanDescendingNode.apparentLongitude;
    m.lilith = moon.orbit.meanApogee.apparentLongitude;
    m.priapus = moon.orbit.meanPerigee.apparentLongitude;
  }
  m.ariesPoint = 0;   // the tropical Aries Point (0° Aries) — a fixed sensitive point, not a body
  return m;
}

function ephAt(date) {
  return new Ephemeris({
    year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(),
    hours: date.getUTCHours(), minutes: date.getUTCMinutes(), seconds: date.getUTCSeconds(),
  });
}

// House (1..12) containing ecliptic longitude `lon`, given the 12 cusp longitudes.
function houseOf(lon, cusps) {
  const L = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const start = norm360(cusps[i]);
    const span = norm360(norm360(cusps[(i + 1) % 12]) - start);
    if (norm360(L - start) < span) return i + 1;
  }
  return 12;
}

const ISO_WALL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Normalise `when` to either a known UTC instant or wall-clock components (1-based month, local).
function parseWhen(when) {
  if (when instanceof Date) return { utc: when };
  if (typeof when === 'string') {
    if (when.endsWith('Z')) return { utc: new Date(when) };
    const m = ISO_WALL.exec(when);
    if (!m) throw new Error(`chart: unrecognised \`when\` string "${when}" (use YYYY-MM-DDTHH:mm:ss)`);
    return { wall: { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +(m[6] ?? 0) } };
  }
  if (when && typeof when === 'object' && 'year' in when) {
    const { year, month, day, hour = 0, minute = 0, second = 0 } = when;
    return { wall: { year, month, day, hour, minute, second } };
  }
  throw new Error('chart: `when` must be a Date, an ISO-ish string, or {year,month,day,...}');
}

/**
 * Compute a natal chart.
 *
 * @param {object}  opts
 * @param {Date|string|object} opts.when   UTC Date, or local wall time as an ISO-ish string /
 *                                          {year,month(1-based),day,hour,minute,second}.
 * @param {{lat:number,lon:number}} [opts.place]  Birth place — needed for angles, houses, and to
 *                                          derive the time zone of a wall-clock `when`.
 * @param {string} [opts.zone]              Explicit IANA zone (skips lat/lon zone lookup).
 * @param {string} [opts.houseSystem='placidus']  Any of HOUSE_SYSTEMS.
 * @param {string[]|'all'} [opts.bodies]    Points to include (default DEFAULT_BODIES).
 * @param {object|false} [opts.aspects]     Aspect options ({minors,orbs,maxOrb,redundant,harmonics,harmonicOrb}) or false to skip.
 * @param {object|boolean} [opts.midpoints]  Midpoint-picture options ({orb,modulus}) or true for
 *                                          defaults; omitted/false → no midpoints computed.
 * @param {string} [opts.zodiac='tropical'] 'tropical' or 'sidereal'.
 * @param {string} [opts.ayanamsha='lahiri'] Sidereal mode ('lahiri' | 'fagan-bradley'); used only
 *                                          when zodiac is 'sidereal'.
 * @returns {Promise<object>} Frozen chart: { meta, bodies, angles, houses, aspects, midpoints }.
 */
export async function chart({ when, place, zone, houseSystem = 'placidus', bodies, aspects = {}, midpoints = false, zodiac = 'tropical', ayanamsha = 'lahiri' } = {}) {
  if (!HOUSE_SYSTEMS.includes(houseSystem)) {
    throw new Error(`chart: unknown houseSystem "${houseSystem}" (one of ${HOUSE_SYSTEMS.join(', ')})`);
  }
  if (zodiac !== 'tropical' && zodiac !== 'sidereal') {
    throw new Error(`chart: zodiac must be 'tropical' or 'sidereal' (got "${zodiac}")`);
  }
  const lat = place?.lat, lon = place?.lon;

  // 1. Resolve the moment to UTC.
  const parsed = parseWhen(when);
  let utc, usedZone = null;
  if (parsed.utc) {
    utc = parsed.utc;
  } else {
    ({ utc, zone: usedZone } = await resolveUTC(parsed.wall, { zone, lat, lon }));
  }

  // Ayanamsha shift: subtract from every tropical longitude for a sidereal chart (0 when tropical).
  // A uniform shift leaves house membership and aspect angles unchanged, so those stay computed on
  // the tropical longitudes; only the displayed longitude/sign moves. `toZ` applies the shift.
  const jdUt = utc.getTime() / 86_400_000 + 2_440_587.5;
  const ayan = zodiac === 'sidereal' ? ayanamshaOf(jdUt, ayanamsha) : 0;
  const toZ = l => norm360(l - ayan);

  // 2. Positions now, plus a centred ±0.5-day pair for longitudinal speed.
  const cur = pointLongitudes(ephAt(utc));
  const before = pointLongitudes(ephAt(new Date(utc.getTime() - HALF_DAY_MS)));
  const after = pointLongitudes(ephAt(new Date(utc.getTime() + HALF_DAY_MS)));

  // 3. Angles + house cusps (only when we have a place).
  let angles = null, houses = null, cusps = null, ascTrop = null, mcTrop = null;
  if (lat != null && lon != null) {
    const eps = obliquity(utc);
    const armc = apparentSiderealTime(utc, lon);
    const asc = ascendant(armc, lat, eps);
    const mc = midheaven(armc, eps);
    ascTrop = asc; mcTrop = mc;   // tropical anchors for shift-invariant aspect math
    const vx = vertex(armc, lat, eps);
    const angle = (key, l) => { const z = toZ(l); return Object.freeze({ key, longitude: z, ...signOf(z) }); };
    angles = Object.freeze({
      ascendant: angle('ascendant', asc),
      midheaven: angle('midheaven', mc),
      descendant: angle('descendant', norm360(asc + 180)),
      imumCoeli: angle('imumCoeli', norm360(mc + 180)),
      vertex: angle('vertex', vx),
      antivertex: angle('antivertex', norm360(vx + 180)),
    });
    // Sun's declination (the Sun sits on the ecliptic, β≈0), needed by the Sunshine system.
    const DEG = Math.PI / 180;
    const sunDec = cur.sun != null ? Math.asin(Math.sin(eps * DEG) * Math.sin(cur.sun * DEG)) / DEG : null;
    cusps = houseCusps(houseSystem, { armc, asc, mc, lat, eps, sunDec });
    // `cusps` stays tropical (used for house membership below); presented cusps carry the ayanamsha.
    houses = Object.freeze(cusps.map((c, i) => { const z = toZ(c); return Object.freeze({ house: i + 1, cusp: z, ...signOf(z) }); }));
  }

  // 4. Assemble the requested bodies.
  const keys = bodies === 'all'
    ? [...Object.keys(cur)]
    : (bodies ?? DEFAULT_BODIES);
  const out = {};
  const aspectPoints = [];
  for (const key of keys) {
    const l = cur[key];
    if (l == null) continue; // unknown/unavailable point — skip silently
    const speed = norm180((after[key] ?? l) - (before[key] ?? l)); // deg/day (central difference)
    const z = toZ(l);                                   // longitude in the chosen zodiac
    const body = Object.freeze({
      key, longitude: z, speed, retrograde: speed < 0,
      house: cusps ? houseOf(l, cusps) : null,          // membership uses tropical l vs tropical cusps
      ...signOf(z),
    });
    out[key] = body;
    aspectPoints.push({ key, longitude: l, speed });    // aspects are shift-invariant → tropical l
  }
  const bodiesOut = Object.freeze(out);

  // Points for aspects & midpoints: bodies plus the two main angles (tropical — both are
  // shift-invariant, so a sidereal chart uses the same math and shifts only the displayed longitude).
  const pts = [...aspectPoints];
  if (angles) {
    pts.push({ key: 'ascendant', longitude: ascTrop });
    pts.push({ key: 'midheaven', longitude: mcTrop });
  }

  // 5. Aspects among those points.
  let aspectsOut = [];
  if (aspects !== false) {
    aspectsOut = findAspects(pts, aspects === true ? {} : aspects);
  }

  // 6. Midpoint pictures (apex = a/b), opt-in. Relationships are frame-invariant; only the reported
  // midpoint longitude carries the ayanamsha.
  let midpointsOut = [];
  if (midpoints) {
    midpointsOut = midpointPictures(pts, midpoints === true ? {} : midpoints)
      .map(m => Object.freeze({ ...m, longitude: toZ(m.longitude) }));
  }

  const meta = Object.freeze({
    utc: utc.toISOString(),
    zone: usedZone ?? zone ?? null,
    julianDay: jdUt,
    deltaT: deltaTSeconds(jdUt),
    obliquity: lat != null ? obliquity(utc) : null,
    siderealTime: lon != null ? apparentSiderealTime(utc, lon) : null,
    houseSystem,
    zodiac,
    ayanamsha: zodiac === 'sidereal' ? Object.freeze({ mode: ayanamsha, value: ayan }) : null,
    place: place ? Object.freeze({ lat, lon }) : null,
  });

  return Object.freeze({ meta, bodies: bodiesOut, angles, houses, aspects: Object.freeze(aspectsOut), midpoints: Object.freeze(midpointsOut) });
}

export { signOf, SIGNS } from './signs.js';
export { findAspects, ASPECTS, REDUNDANT_PAIRS } from './aspects.js';
export { midpoint, midpoints, midpointPictures } from './midpoints.js';
export { spaceAngles } from './layout.js';
export { resolveUTC } from './timezone.js';
export { ayanamsha, AYANAMSHAS, toSidereal } from './ayanamsha.js';
