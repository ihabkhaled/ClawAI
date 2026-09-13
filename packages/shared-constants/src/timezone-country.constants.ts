// ---- IANA time zone → ISO-3166-1 alpha-2 country ----
//
// The WEAKEST geolocation signal, and the last one consulted. The browser sets
// it, so a visitor can change it, and a laptop that never left Cairo can report
// Europe/London because someone was travelling when they set it up.
//
// It earns its place anyway: it is the only signal that works when the request
// never crossed the internet. On a local install, behind a corporate NAT, or on
// any deployment where nginx sees a private address, IP geolocation correctly
// declines to answer and this is the difference between AUTO working and AUTO
// always meaning USD.
//
// Not exhaustive, and not meant to be. It covers the zones for countries ClawAI
// maps to a display currency; anything else falls through to USD, which is the
// honest answer rather than a guess.
export const TIMEZONE_TO_COUNTRY: Readonly<Record<string, string>> = Object.freeze({
  // Africa
  'Africa/Abidjan': 'CI',
  'Africa/Accra': 'GH',
  'Africa/Algiers': 'DZ',
  'Africa/Bamako': 'ML',
  'Africa/Bangui': 'CF',
  'Africa/Banjul': 'GM',
  'Africa/Bissau': 'GW',
  'Africa/Brazzaville': 'CG',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Conakry': 'GN',
  'Africa/Dakar': 'SN',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Douala': 'CM',
  'Africa/Johannesburg': 'ZA',
  'Africa/Kampala': 'UG',
  'Africa/Lagos': 'NG',
  'Africa/Libreville': 'GA',
  'Africa/Lome': 'TG',
  'Africa/Malabo': 'GQ',
  'Africa/Nairobi': 'KE',
  'Africa/Ndjamena': 'TD',
  'Africa/Niamey': 'NE',
  'Africa/Ouagadougou': 'BF',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Tunis': 'TN',
  Egypt: 'EG',

  // Americas
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Argentina/Cordoba': 'AR',
  'America/Argentina/Mendoza': 'AR',
  'America/Bogota': 'CO',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Detroit': 'US',
  'America/Edmonton': 'CA',
  'America/Guayaquil': 'EC',
  'America/Halifax': 'CA',
  'America/Lima': 'PE',
  'America/Los_Angeles': 'US',
  'America/Mexico_City': 'MX',
  'America/Monterrey': 'MX',
  'America/Montevideo': 'UY',
  'America/Montreal': 'CA',
  'America/New_York': 'US',
  'America/Panama': 'PA',
  'America/Phoenix': 'US',
  'America/Sao_Paulo': 'BR',
  'America/Santiago': 'CL',
  'America/El_Salvador': 'SV',
  'America/Tijuana': 'MX',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Winnipeg': 'CA',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',

  // Asia
  'Asia/Amman': 'JO',
  'Asia/Baghdad': 'IQ',
  'Asia/Bahrain': 'BH',
  'Asia/Bangkok': 'TH',
  'Asia/Beirut': 'LB',
  'Asia/Colombo': 'LK',
  'Asia/Dhaka': 'BD',
  'Asia/Dubai': 'AE',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Jakarta': 'ID',
  'Asia/Jerusalem': 'IL',
  'Asia/Kabul': 'AF',
  'Asia/Karachi': 'PK',
  'Asia/Kathmandu': 'NP',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuwait': 'KW',
  'Asia/Manila': 'PH',
  'Asia/Muscat': 'OM',
  'Asia/Qatar': 'QA',
  'Asia/Riyadh': 'SA',
  'Asia/Saigon': 'VN',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG',
  'Asia/Taipei': 'TW',
  'Asia/Tehran': 'IR',
  'Asia/Tokyo': 'JP',
  'Asia/Istanbul': 'TR',
  'Europe/Istanbul': 'TR',

  // Europe
  'Europe/Amsterdam': 'NL',
  'Europe/Athens': 'GR',
  'Europe/Belgrade': 'RS',
  'Europe/Berlin': 'DE',
  'Europe/Bratislava': 'SK',
  'Europe/Brussels': 'BE',
  'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU',
  'Europe/Copenhagen': 'DK',
  'Europe/Dublin': 'IE',
  'Europe/Helsinki': 'FI',
  'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA',
  'Europe/Lisbon': 'PT',
  'Europe/Ljubljana': 'SI',
  'Europe/London': 'GB',
  'Europe/Luxembourg': 'LU',
  'Europe/Madrid': 'ES',
  'Europe/Malta': 'MT',
  'Europe/Monaco': 'MC',
  'Europe/Moscow': 'RU',
  'Europe/Oslo': 'NO',
  'Europe/Paris': 'FR',
  'Europe/Prague': 'CZ',
  'Europe/Reykjavik': 'IS',
  'Europe/Riga': 'LV',
  'Europe/Rome': 'IT',
  'Europe/Sofia': 'BG',
  'Europe/Stockholm': 'SE',
  'Europe/Tallinn': 'EE',
  'Europe/Vienna': 'AT',
  'Europe/Vilnius': 'LT',
  'Europe/Warsaw': 'PL',
  'Europe/Zagreb': 'HR',
  'Europe/Zurich': 'CH',

  // Oceania
  'Australia/Adelaide': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ',
});

// Longest plausible IANA identifier, bounded so a hint arriving from a browser
// cannot become an unbounded string on its way to a lookup.
export const TIMEZONE_HINT_MAX_LENGTH = 64;

/**
 * Country for a browser-reported time zone, or null.
 *
 * Also accepts a bare 2-letter country code, because the resolver's hint field
 * has always carried one and an older frontend still sends that.
 */
export function resolveTimezoneCountry(timezone: string | null | undefined): string | null {
  if (timezone === null || timezone === undefined) {
    return null;
  }
  const trimmed = timezone.trim();
  if (trimmed.length === 0 || trimmed.length > TIMEZONE_HINT_MAX_LENGTH) {
    return null;
  }
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  // Case-insensitive: browsers agree on the canonical spelling, but a hand-set
  // or proxied value should not fail over capitalisation alone.
  const match = Object.keys(TIMEZONE_TO_COUNTRY).find(
    (zone) => zone.toLowerCase() === trimmed.toLowerCase(),
  );
  return match === undefined ? null : (TIMEZONE_TO_COUNTRY[match] ?? null);
}
