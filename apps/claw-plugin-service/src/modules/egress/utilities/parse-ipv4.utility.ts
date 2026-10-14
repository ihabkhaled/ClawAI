import {
  BYTE_RANGE,
  LEGACY_IPV4_PART_PATTERN,
  MAX_LEGACY_PART_VALUE,
  OCTAL_PART_PATTERN,
  STRICT_OCTET_PATTERN,
} from '../constants/egress.constants';

/** Four decimal octets with no leading zeros, exactly as a resolver prints an address. */
export function parseStrictIpv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!STRICT_OCTET_PATTERN.test(part)) return null;
    const value = Number(part);
    if (value >= BYTE_RANGE) return null;
    octets.push(value);
  }
  return octets;
}

function legacyPartValue(part: string): number | null {
  if (!LEGACY_IPV4_PART_PATTERN.test(part)) return null;
  if (part.startsWith('0x') || part.startsWith('0X')) {
    const digits = part.slice(2);
    return digits === '' ? 0 : Number.parseInt(digits, 16);
  }
  if (part.length > 1 && part.startsWith('0')) {
    return OCTAL_PART_PATTERN.test(part) ? Number.parseInt(part.slice(1), 8) : null;
  }
  return Number(part);
}

/**
 * The classic inet_aton reading of a host: one to four parts, each decimal, octal (leading 0) or
 * hex (0x), the last part filling the remaining bytes. "2130706433", "0x7f.1", "017700000001"
 * and "127.1" are all 127.x addresses. Returns the four bytes, or null when the text is not a
 * number in any of those forms. The WHATWG URL parser already folds these forms, so this is the
 * second line of defence for any caller that holds a host string that did not come through it.
 */
export function parseLegacyIpv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  const values: number[] = [];
  for (const part of parts) {
    const value = legacyPartValue(part);
    if (value === null || value > MAX_LEGACY_PART_VALUE) return null;
    values.push(value);
  }
  const last = values.pop() ?? 0;
  if (values.some((value) => value >= BYTE_RANGE)) return null;
  const room = BYTE_RANGE ** (4 - values.length);
  if (last >= room) return null;
  let total = last;
  for (const [index, value] of values.entries()) {
    total += value * BYTE_RANGE ** (3 - index);
  }
  return [
    Math.floor(total / BYTE_RANGE ** 3) % BYTE_RANGE,
    Math.floor(total / BYTE_RANGE ** 2) % BYTE_RANGE,
    Math.floor(total / BYTE_RANGE) % BYTE_RANGE,
    total % BYTE_RANGE,
  ];
}
