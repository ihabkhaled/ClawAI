import { BlockList, isIP } from 'node:net';

import {
  BLOCKED_IPV4_SUBNETS,
  BLOCKED_IPV6_SUBNETS,
  IPV4_MAPPED_IPV6_SUBNET,
} from './network-address.constants';

let blockList: BlockList | undefined;
let mappedList: BlockList | undefined;

function blocked(): BlockList {
  if (blockList) return blockList;
  const list = new BlockList();
  for (const [network, prefix] of BLOCKED_IPV4_SUBNETS) list.addSubnet(network, prefix, 'ipv4');
  for (const [network, prefix] of BLOCKED_IPV6_SUBNETS) list.addSubnet(network, prefix, 'ipv6');
  blockList = list;
  return list;
}

function mapped(): BlockList {
  if (mappedList) return mappedList;
  const list = new BlockList();
  list.addSubnet(IPV4_MAPPED_IPV6_SUBNET[0], IPV4_MAPPED_IPV6_SUBNET[1], 'ipv6');
  mappedList = list;
  return list;
}

/** Strips the brackets URL.hostname keeps around an IPv6 literal. */
export function unbracketHost(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

/** True when `address` is an IP literal (v4 or v6). */
export function isIpLiteral(address: string): boolean {
  return isIP(unbracketHost(address)) !== 0;
}

/**
 * True only for a routable public address. Private, loopback, link-local (incl. the
 * cloud metadata 169.254.169.254), CGNAT, ULA, multicast, documentation and
 * IPv4-mapped IPv6 addresses are all refused. A non-IP string is not public.
 */
export function isPublicIpAddress(address: string): boolean {
  const ip = unbracketHost(address);
  const family = isIP(ip);
  if (family === 0) return false;
  return family === 4
    ? !blocked().check(ip, 'ipv4')
    : !blocked().check(ip, 'ipv6') && !mapped().check(ip, 'ipv6');
}
