import { isIPv4, isIPv6 } from 'node:net';

import {
  IPV6_GROUP_COUNT,
  METADATA_IPV4_ADDRESSES,
  METADATA_IPV6_ADDRESSES,
} from '../constants/ip-address.constants';

/**
 * Range checks on RESOLVED addresses (and on IP literals).
 *
 * Works on bytes, never on the textual form: `::ffff:7f00:1`, `::ffff:127.0.0.1`
 * and `0:0:0:0:0:ffff:7f00:1` are one address, and a regex on any one spelling
 * misses the others (the WHATWG URL parser rewrites the dotted form to the hex
 * form, so a check that only knew the dotted form was bypassable).
 */

/** Whether an IPv4 address (four octets) is not a public unicast address. */
export function isNonPublicIpv4(octets: readonly number[]): boolean {
  const [a, b, c] = octets;
  if (a === undefined || b === undefined) {
    return true;
  }
  // 0/8 "this network", 10/8, 127/8 loopback.
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  // 169.254/16 link-local, which includes every cloud metadata address.
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  // 100.64/10 carrier-grade NAT — reaches other tenants on shared hosting.
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  // 192.0.0/24 IETF protocol assignments, 192.0.2/24 TEST-NET-1.
  if (a === 192 && b === 0) {
    return true;
  }
  // 198.18/15 benchmarking, 198.51.100/24 and 203.0.113/24 documentation.
  if (a === 198 && (b === 18 || b === 19)) {
    return true;
  }
  if ((a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) {
    return true;
  }
  // 224/4 multicast and 240/4 reserved, which includes 255.255.255.255.
  return a >= 224;
}

function ipv4Octets(address: string): number[] | null {
  return !isIPv4(address) ? null : address.split('.').map((part) => Number.parseInt(part, 10));
}

function splitGroups(text: string): string[] {
  return text === '' ? [] : text.split(':');
}

/** The 16 bytes of an IPv6 address in any textual spelling, or null. */
export function ipv6Bytes(address: string): number[] | null {
  const bare = (address.replace(/^\[/u, '').replace(/\]$/u, '').split('%')[0] ?? '').toLowerCase();
  if (!isIPv6(bare)) {
    return null;
  }
  let text = bare;
  const tail = /(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(text)?.[1];
  if (tail !== undefined) {
    const octets = ipv4Octets(tail);
    if (octets === null) {
      return null;
    }
    const high = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const low = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    text = `${text.slice(0, text.length - tail.length)}${high.toString(16)}:${low.toString(16)}`;
  }
  const halves = text.split('::');
  const head = splitGroups(halves[0] ?? '');
  const rest = splitGroups(halves[1] ?? '');
  const fill = Math.max(0, IPV6_GROUP_COUNT - head.length - rest.length);
  const groups = halves.length > 1 ? [...head, ...Array<string>(fill).fill('0'), ...rest] : head;
  if (groups.length !== IPV6_GROUP_COUNT) {
    return null;
  }
  const bytes: number[] = [];
  for (const group of groups) {
    const value = Number.parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

function allZero(bytes: readonly number[], from: number, to: number): boolean {
  return bytes.slice(from, to).every((value) => value === 0);
}

/** The IPv4 address an IPv6 address carries inside it, when it carries one. */
function embeddedIpv4(bytes: readonly number[]): number[] | null {
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible).
  if (allZero(bytes, 0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return bytes.slice(12);
  }
  if (allZero(bytes, 0, 12)) {
    return bytes.slice(12);
  }
  // 64:ff9b::/96 NAT64 well-known prefix.
  if (bytes[0] === 0 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && allZero(bytes, 4, 12)) {
      return bytes.slice(12);
    }
  // 2002::/16 6to4 carries the IPv4 address in bytes 2..5.
  return bytes[0] === 0x20 && bytes[1] === 0x02 ? bytes.slice(2, 6) : null;
}

/** Whether an IPv6 address is not a routable public unicast address. */
export function isNonPublicIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);
  if (bytes === null) {
    return true;
  }
  // `::` and `::1` are caught here too: they are "compatible" form with a
  // zero or one IPv4 tail, and 0.0.0.0 / 0.0.0.1 are non-public.
  const embedded = embeddedIpv4(bytes);
  if (embedded !== null) {
    return isNonPublicIpv4(embedded);
  }
  const first = bytes[0] ?? 0;
  const second = bytes[1] ?? 0;
  // fc00::/7 unique-local; fe80::/10 link-local and fec0::/10 site-local.
  if ((first & 0xfe) === 0xfc || (first === 0xfe && second >= 0x80)) {
    return true;
  }
  // ff00::/8 multicast.
  if (first === 0xff) {
    return true;
  }
  // 100::/64 discard.
  if (first === 0x01 && second === 0x00 && allZero(bytes, 2, 8)) {
    return true;
  }
  // 2001::/23 IETF protocol assignments (Teredo, benchmarking) and 2001:db8::/32.
  if (first === 0x20 && second === 0x01) {
    return bytes[2] === 0 || bytes[2] === 1 || (bytes[2] === 0x0d && bytes[3] === 0xb8);
  }
  // 64:ff9b:1::/48 local-use NAT64.
  return first === 0 && second === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b;
}

/** Whether any IP (v4 or v6, any spelling) is not a public unicast address. */
export function isNonPublicIp(address: string): boolean {
  const octets = ipv4Octets(address);
  return octets === null ? isNonPublicIpv6(address) : isNonPublicIpv4(octets);
}

/** Whether an IP is a cloud-metadata endpoint, including wrapped in IPv6. */
export function isMetadataIp(address: string): boolean {
  const v4 = ipv4Octets(address);
  if (v4 !== null) {
    return METADATA_IPV4_ADDRESSES.has(v4.join('.'));
  }
  const bytes = ipv6Bytes(address);
  if (bytes === null) {
    return false;
  }
  const embedded = embeddedIpv4(bytes);
  if (embedded !== null) {
    return METADATA_IPV4_ADDRESSES.has(embedded.join('.'));
  }
  const groups: string[] = [];
  for (let index = 0; index < bytes.length; index += 2) {
    groups.push((((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0)).toString(16));
  }
  return METADATA_IPV6_ADDRESSES.has(groups.join(':'));
}
