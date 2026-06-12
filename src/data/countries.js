// Länder -> ISO-2-Code, für Flaggen (Emoji offline, flagcdn.com online).

export const COUNTRY_ISO = {
  'China': 'cn', 'Südkorea': 'kr', 'Japan': 'jp', 'Taiwan': 'tw', 'Singapur': 'sg',
  'Malaysia': 'my', 'Indonesien': 'id', 'Thailand': 'th', 'Philippinen': 'ph', 'Vietnam': 'vn',
  'Indien': 'in', 'Sri Lanka': 'lk', 'Pakistan': 'pk', 'Bangladesch': 'bd', 'VAE': 'ae',
  'Saudi-Arabien': 'sa', 'Iran': 'ir', 'Kuwait': 'kw', 'Griechenland': 'gr', 'Spanien': 'es',
  'Italien': 'it', 'Frankreich': 'fr', 'Portugal': 'pt', 'Niederlande': 'nl', 'Belgien': 'be',
  'Deutschland': 'de', 'Großbritannien': 'gb', 'Polen': 'pl', 'Schweden': 'se', 'Russland': 'ru',
  'USA': 'us', 'Kanada': 'ca', 'Mexiko': 'mx', 'Brasilien': 'br', 'Argentinien': 'ar',
  'Peru': 'pe', 'Chile': 'cl', 'Kolumbien': 'co', 'Südafrika': 'za', 'Nigeria': 'ng',
  'Kenia': 'ke', 'Marokko': 'ma', 'Ägypten': 'eg', 'Elfenbeinküste': 'ci',
  'Australien': 'au', 'Neuseeland': 'nz',
};

export function isoOf(country) { return COUNTRY_ISO[country] || ''; }

// Emoji-Flagge aus ISO-2 (regionale Indikator-Symbole) – funktioniert offline.
export function flagEmoji(country) {
  const iso = isoOf(country);
  if (!iso) return '🏳️';
  return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// Rasterflagge (online) – flagcdn.com liefert kleine PNGs.
export function flagUrl(country, w = 160) {
  const iso = isoOf(country);
  return iso ? `https://flagcdn.com/w${w}/${iso}.png` : '';
}
