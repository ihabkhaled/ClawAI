import { isIP } from 'node:net';

import {
  IPV4_NETWORK_OCTETS,
  IPV4_NETWORK_PREFIX_BITS,
  IPV6_HEXTET_COUNT,
  IPV6_NETWORK_HEXTETS,
  IPV6_NETWORK_PREFIX_BITS,
} from '../constants/anti-abuse.constants';

function ipv4Tail(tail: string): string[] {
  const octets = tail.split('.').map(Number);
  const [a = 0, b = 0, c = 0, d = 0] = octets;
  return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
}

function splitGroups(part: string): string[] {
  return part.length === 0 ? [] : part.split(':');
}

/** The eight 16-bit groups of an IPv6 address (`::` and an IPv4 tail expanded). */
export function expandIpv6(address: string): number[] | null {
  const groups = address.toLowerCase().split(':');
  const last = groups.at(-1) ?? '';
  const withoutTail = last.includes('.')
    ? [...groups.slice(0, -1), ...ipv4Tail(last)].join(':')
    : address.toLowerCase();
  const halves = withoutTail.split('::');
  const head = splitGroups(halves[0] ?? '');
  const tail = splitGroups(halves[1] ?? '');
  const zeros = Array.from({ length: IPV6_HEXTET_COUNT - head.length - tail.length }, () => '0');
  const all = halves.length === 2 ? [...head, ...zeros, ...tail] : head;
  const valid =
    all.length === IPV6_HEXTET_COUNT && all.every((group) => /^[0-9a-f]{1,4}$/u.test(group));
  return valid ? all.map((group) => Number.parseInt(group, 16)) : null;
}

function ipv6Network(address: string): string | null {
  const hextets = expandIpv6(address);
  if (hextets === null) {
    return null;
  }
  const head = hextets.slice(0, IPV6_NETWORK_HEXTETS);
  while (head.length > 0 && head.at(-1) === 0) {
    head.pop();
  }
  return `${head.map((h) => h.toString(16)).join(':')}::/${IPV6_NETWORK_PREFIX_BITS}`;
}

/**
 * The network a registration came from: IPv4 /24 as `a.b.c.0/24`, IPv6 /48 in
 * the exact text Postgres prints for `network(set_masklen(ip::inet, 48))`
 * (`2001:db8:1::/48`, `2001:db8::/48`, `::/48`), so rows backfilled by the
 * migration and rows written here compare equal. Null for anything else.
 */
export function toRegistrationNetwork(ip: string | null): string | null {
  if (ip === null) {
    return null;
  }
  const version = isIP(ip);
  if (version === 4) {
    const octets = ip.split('.').slice(0, IPV4_NETWORK_OCTETS).map(Number);
    return `${octets.join('.')}.0/${IPV4_NETWORK_PREFIX_BITS}`;
  }
  return version === 6 ? ipv6Network(ip) : null;
}
