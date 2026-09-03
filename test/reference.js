// Geocentric apparent tropical longitudes (degrees) from a reference ephemeris (JPL DE), used as
// regression fixtures. Regenerate against any JPL-DE ephemeris at the same UT instants.
// `northnode` is the mean lunar node.
export const EPOCHS = {
  '1990-01-01T12:00:00Z': { year: 1990, month: 0, day: 1, hours: 12, minutes: 0, seconds: 0, latitude: 0, longitude: 0 },
  '2025-06-15T00:00:00Z': { year: 2025, month: 5, day: 15, hours: 0, minutes: 0, seconds: 0, latitude: 0, longitude: 0 },
};

export const REFERENCE = {
  '1990-01-01T12:00:00Z': {
    sun: 280.8143, moon: 333.2677, mercury: 295.6728, venus: 306.222, mars: 250.0001,
    jupiter: 95.1488, saturn: 285.6575, uranus: 275.7854, neptune: 282.0381, pluto: 227.0931,
    northnode: 318.435, eris: 16.2468, ceres: 85.5537, pallas: 1.5595, juno: 223.9917,
    vesta: 317.4428, chiron: 103.8133, cupido: 230.2448, hades: 67.9077, zeus: 177.3439,
    kronos: 80.6788, apollon: 195.0803, admetos: 43.2356, vulkanus: 104.93, poseidon: 209.7456,
  },
  '2025-06-15T00:00:00Z': {
    sun: 84.1639, moon: 306.9742, mercury: 101.5926, venus: 38.9358, mars: 148.685,
    jupiter: 91.1645, saturn: 1.2753, uranus: 58.8896, neptune: 2.0675, pluto: 303.4472,
    northnode: 352.7605, eris: 25.6117, ceres: 8.4898, pallas: 325.1384, juno: 228.0849,
    vesta: 215.3577, chiron: 26.2792, cupido: 278.9524, hades: 103.8768, zeus: 204.0466,
    kronos: 105.5208, apollon: 215.8109, admetos: 64.828, vulkanus: 123.6754, poseidon: 225.8516,
  },
};

// Per-body tolerance in arcseconds. Planets/Moon are limited by Astronomy Engine's VSOP87/ELP
// truncation; TNPs/asteroids by the two-body/nearest-epoch model; the mean node by the model
// difference between our Meeus formula and the reference; Eris by orbit-solution divergence.
export const TOLERANCE_ARCSEC = {
  default: 12,
  moon: 2,
  northnode: 120,
  eris: 40,
};
