// Sidereal ayanamshas — the angle (degrees) to SUBTRACT from a tropical, ecliptic-of-date longitude
// to obtain a sidereal longitude. Precession-based (mean of date, no nutation), ported from the
// clean-room astro-ephemeris implementation: a Fagan/Bradley polynomial plus a constant per-mode
// offset. A uniform shift of every longitude leaves house membership and aspects unchanged — only
// the sign/degree presentation moves.

const norm360 = x => ((x % 360) + 360) % 360;

// Fagan/Bradley mean ayanamsha (degrees); `jd` is a UT Julian Day. Reproduces the reference mean
// Fagan/Bradley ayanamsha to < 0.001".
function faganBradley(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  return 24.740299992530538 + 1.3968879761381343 * t + 0.000307085313771438 * t * t;
}

// Supported modes, as offsets (degrees) relative to Fagan/Bradley.
const OFFSETS = {
  'fagan-bradley': 0,
  lahiri: -0.8832077,
};

export const AYANAMSHAS = Object.keys(OFFSETS);

// Ayanamsha (degrees) for a UT Julian Day and mode. Throws on an unknown mode.
export function ayanamsha(jd, mode = 'lahiri') {
  const offset = OFFSETS[mode];
  if (offset == null) throw new Error(`ayanamsha: unknown mode "${mode}" (one of ${AYANAMSHAS.join(', ')})`);
  return faganBradley(jd) + offset;
}

// Shift a tropical longitude into the sidereal frame for the given ayanamsha value.
export const toSidereal = (lon, ayan) => norm360(lon - ayan);
