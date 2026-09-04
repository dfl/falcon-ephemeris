// Zodiac signs and the derived qualities of an ecliptic longitude. Pure lookups — no ephemeris.

const norm360 = x => ((x % 360) + 360) % 360;

// index 0..11 = Aries..Pisces. element/modality/polarity are the classical attributions; `ruler`
// is the traditional (visible-planet) domicile ruler.
export const SIGNS = [
  { key: 'aries',       symbol: '♈', element: 'fire',  modality: 'cardinal', polarity: 'positive', ruler: 'mars' },
  { key: 'taurus',      symbol: '♉', element: 'earth', modality: 'fixed',    polarity: 'negative', ruler: 'venus' },
  { key: 'gemini',      symbol: '♊', element: 'air',   modality: 'mutable',  polarity: 'positive', ruler: 'mercury' },
  { key: 'cancer',      symbol: '♋', element: 'water', modality: 'cardinal', polarity: 'negative', ruler: 'moon' },
  { key: 'leo',         symbol: '♌', element: 'fire',  modality: 'fixed',    polarity: 'positive', ruler: 'sun' },
  { key: 'virgo',       symbol: '♍', element: 'earth', modality: 'mutable',  polarity: 'negative', ruler: 'mercury' },
  { key: 'libra',       symbol: '♎', element: 'air',   modality: 'cardinal', polarity: 'positive', ruler: 'venus' },
  { key: 'scorpio',     symbol: '♏', element: 'water', modality: 'fixed',    polarity: 'negative', ruler: 'mars' },
  { key: 'sagittarius', symbol: '♐', element: 'fire',  modality: 'mutable',  polarity: 'positive', ruler: 'jupiter' },
  { key: 'capricorn',   symbol: '♑', element: 'earth', modality: 'cardinal', polarity: 'negative', ruler: 'saturn' },
  { key: 'aquarius',    symbol: '♒', element: 'air',   modality: 'fixed',    polarity: 'positive', ruler: 'saturn' },
  { key: 'pisces',      symbol: '♓', element: 'water', modality: 'mutable',  polarity: 'negative', ruler: 'jupiter' },
];

// Resolve an ecliptic longitude to its sign placement: which sign, degrees into that sign, and the
// decan (1..3, each a 10-degree third). Returns a frozen plain object.
export function signOf(longitude) {
  const lon = norm360(longitude);
  const index = Math.floor(lon / 30);
  const degreesInSign = lon - index * 30;
  const sign = SIGNS[index];
  return Object.freeze({
    sign: sign.key,
    signIndex: index,
    symbol: sign.symbol,
    element: sign.element,
    modality: sign.modality,
    polarity: sign.polarity,
    ruler: sign.ruler,
    degreesInSign,
    decan: Math.floor(degreesInSign / 10) + 1,
  });
}
