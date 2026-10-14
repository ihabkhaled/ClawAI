import { BYTE_RANGE, IPV4_BITS, NON_PUBLIC_IPV4_RANGES } from '../constants/egress.constants';
import { parseStrictIpv4 } from './parse-ipv4.utility';
import { parseIpv6 } from './parse-ipv6.utility';

function ipv4ToNumber(octets: readonly number[]): number {
  const [a = 0, b = 0, c = 0, d = 0] = octets;
  return ((a * 256 + b) * 256 + c) * 256 + d;
}

/** True when the four bytes are a routable public IPv4 address. */
export function isPublicIpv4(octets: readonly number[]): boolean {
  const value = ipv4ToNumber(octets);
  return !NON_PUBLIC_IPV4_RANGES.some(([a, b, c, d, bits]) => {
    const size = 2 ** (IPV4_BITS - bits);
    return Math.floor(value / size) === Math.floor(ipv4ToNumber([a, b, c, d]) / size);
  });
}

function embeddedIpv4(high: number, low: number): number[] {
  return [
    Math.floor(high / BYTE_RANGE),
    high % BYTE_RANGE,
    Math.floor(low / BYTE_RANGE),
    low % BYTE_RANGE,
  ];
}

/**
 * True only for global-unicast IPv6 (2000::/3) outside the reserved blocks inside it. Every form
 * that carries an IPv4 address (mapped ::ffff:0:0/96, NAT64 64:ff9b::/96, 6to4 2002::/16) is
 * judged by the IPv4 address it carries, so ::ffff:127.0.0.1 and 64:ff9b::7f00:1 are refused.
 */
export function isPublicIpv6(groups: readonly number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = groups;
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0) {
    // ::/96 (unspecified, loopback, IPv4-compatible) is never public; ::ffff:0:0/96 is judged by its IPv4.
    return g5 === 0xff_ff ? isPublicIpv4(embeddedIpv4(g6, g7)) : false;
  }
  if (g0 === 0x64 && g1 === 0xff_9b) {
    const nat64 = g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0;
    return nat64 ? isPublicIpv4(embeddedIpv4(g6, g7)) : false;
  }
  // Only 2000::/3 is global unicast: fc00::/7, fe80::/10, fec0::/10, ff00::/8 and the rest fall out here.
  if ((g0 & 0xe0_00) !== 0x20_00) return false;
  if (g0 === 0x20_02) return isPublicIpv4(embeddedIpv4(g1, g2));
  return g0 === 0x20_01 && (g1 < 0x02_00 || g1 === 0x0d_b8)
    ? false
    : !(g0 === 0x3f_ff && (g1 & 0xf0_00) === 0);
}

/**
 * True only when `address` is a canonical public IPv4 or IPv6 address. Anything that is not one of
 * those two canonical forms (hex or octal IPv4, a zone id, text) is NOT public: the function
 * fails closed.
 */
export function isPublicIpAddress(address: string): boolean {
  const v4 = parseStrictIpv4(address);
  if (v4 !== null) return isPublicIpv4(v4);
  const v6 = parseIpv6(address);
  return v6 !== null && isPublicIpv6(v6);
}
