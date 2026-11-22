/** IPv4 ranges that are never a public stream origin: [network, prefix]. */
export const BLOCKED_IPV4_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

/** IPv6 ranges that are never a public stream origin: [network, prefix]. */
export const BLOCKED_IPV6_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
];

/**
 * IPv4-mapped IPv6 (::ffff:0:0/96), refused for IPv6 inputs only: in a node:net BlockList
 * this subnet also matches every plain IPv4 address, so it lives in its own list.
 */
export const IPV4_MAPPED_IPV6_SUBNET: readonly [string, number] = ['::ffff:0:0', 96];
