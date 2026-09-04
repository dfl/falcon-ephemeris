// Turn a local wall-clock birth time into a precise UTC instant, using the IANA time zone of the
// birth place. Zone lookup is `tz-lookup` (CC0); the historical UTC offset comes from the runtime's
// built-in `Intl.DateTimeFormat` — no moment, no offset tables to ship or keep current.

// The UTC-offset (ms, local − UTC) that zone `zone` was on at UTC instant `date`.
function zoneOffsetMs(zone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - date.getTime();
}

// Convert wall-clock components (interpreted in `zone`) to a UTC Date. Two passes so a DST-varying
// offset resolves: guess with the wall time's own offset, then re-evaluate at that instant.
export function wallTimeToUTC({ year, month, day, hour = 0, minute = 0, second = 0 }, zone) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second); // month is 1-based here
  let utc = wall - zoneOffsetMs(zone, new Date(wall));
  utc = wall - zoneOffsetMs(zone, new Date(utc));
  return new Date(utc);
}

// Resolve a birth place + local wall time to a UTC Date and the zone that was used. If `zone` is
// given it's used directly; otherwise it's derived from lat/lon via tz-lookup (lazy-imported so the
// dependency is only needed when you actually geolocate). `wall` is 1-based-month components.
export async function resolveUTC(wall, { zone, lat, lon } = {}) {
  let tz = zone;
  if (!tz) {
    if (lat == null || lon == null) {
      throw new Error('resolveUTC: provide a `zone`, or `lat`/`lon` to derive one');
    }
    const { default: tzLookup } = await import('tz-lookup');
    tz = tzLookup(lat, lon);
  }
  return { utc: wallTimeToUTC(wall, tz), zone: tz };
}
