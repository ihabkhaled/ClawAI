import { IPV6_GROUP_COUNT, IPV6_GROUP_PATTERN } from '../constants/egress.constants';
import { parseStrictIpv4 } from './parse-ipv4.utility';

function parseGroups(text: string): number[] | null {
  if (text === '') return [];
  const groups: number[] = [];
  const pieces = text.split(':');
  for (const [index, piece] of pieces.entries()) {
    if (index === pieces.length - 1 && piece.includes('.')) {
      const v4 = parseStrictIpv4(piece);
      if (v4 === null) return null;
      const [a = 0, b = 0, c = 0, d = 0] = v4;
      groups.push(a * 256 + b, c * 256 + d);
    } else if (IPV6_GROUP_PATTERN.test(piece)) {
      groups.push(Number.parseInt(piece, 16));
    } else {
      return null;
    }
  }
  return groups;
}

/**
 * Eight 16-bit groups of an IPv6 address, or null when the text is not one. Accepts the "::"
 * shorthand and a dotted IPv4 tail (::ffff:1.2.3.4); refuses zone ids ("%eth0") and anything
 * else, so a caller that fails closed on null never lets an odd form through.
 */
export function parseIpv6(text: string): number[] | null {
  const bare = text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : text;
  if (bare === '' || bare.includes('%') || !bare.includes(':')) return null;
  const halves = bare.split('::');
  if (halves.length > 2) return null;
  const head = parseGroups(halves[0] ?? '');
  if (head === null) return null;
  if (halves.length === 1) return head.length === IPV6_GROUP_COUNT ? head : null;
  const tail = parseGroups(halves[1] ?? '');
  if (tail === null || head.length + tail.length >= IPV6_GROUP_COUNT) return null;
  const zeros = Array.from<number>({ length: IPV6_GROUP_COUNT - head.length - tail.length }).fill(
    0,
  );
  return [...head, ...zeros, ...tail];
}
