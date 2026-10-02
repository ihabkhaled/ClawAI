import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

import {
  IPV4_MAPPED_IPV6_PREFIX,
  TRUSTED_PROXY_CACHE_TTL_MS,
  TRUSTED_PROXY_HOSTNAME,
  TRUSTED_PROXY_MIN_REFRESH_MS,
} from './throttle-tracker.constants';
import type { TrustedProxyCache } from './throttle-tracker.types';

let proxyCache: TrustedProxyCache | null = null;
let pendingLookup: Promise<TrustedProxyCache> | null = null;
let configuredRaw: string | null = null;
let configuredList = new BlockList();

/**
 * True when `peer` (an already-normalised address) is a proxy whose
 * X-Real-IP may be believed: loopback, an address or CIDR listed in
 * TRUSTED_PROXY_ADDRESSES, or the current docker address of `nginx`.
 */
export async function isTrustedProxyAddress(peer: string): Promise<boolean> {
  if (isLoopback(peer) || isConfiguredProxy(peer)) {
    return true;
  }
  const now = Date.now();
  const cached = proxyCache;
  const age = cached === null ? Number.POSITIVE_INFINITY : now - cached.resolvedAt;
  const known = cached?.addresses.has(peer) ?? false;
  // A known proxy is reused for the whole TTL; an unknown peer re-resolves at
  // most once per refresh floor, in case nginx was recreated on a new address.
  if (age < (known ? TRUSTED_PROXY_CACHE_TTL_MS : TRUSTED_PROXY_MIN_REFRESH_MS)) {
    return known;
  }
  const fresh = await resolveProxyAddresses();
  return fresh.addresses.has(peer);
}

/** Drops the resolved proxy addresses and the parsed list. Tests only need it. */
export function resetTrustedProxyCache(): void {
  proxyCache = null;
  pendingLookup = null;
  configuredRaw = null;
  configuredList = new BlockList();
}

function isLoopback(address: string): boolean {
  return address === '::1' || (isIP(address) === 4 && address.startsWith('127.'));
}

function isConfiguredProxy(peer: string): boolean {
  const raw = process.env['TRUSTED_PROXY_ADDRESSES'] ?? '';
  if (raw !== configuredRaw) {
    configuredRaw = raw;
    configuredList = parseProxyList(raw);
  }
  const family = isIP(peer) === 6 ? 'ipv6' : 'ipv4';
  return configuredList.check(peer, family);
}

/** `a.b.c.d`, `a.b.c.d/nn`, IPv6 likewise; anything else is skipped. */
function parseProxyList(raw: string): BlockList {
  const list = new BlockList();
  for (const entry of raw.split(',')) {
    const [address = '', prefixText] = entry.trim().split('/');
    const version = isIP(address);
    if (version === 0) {
      continue;
    }
    const family = version === 6 ? 'ipv6' : 'ipv4';
    if (prefixText === undefined) {
      list.addAddress(address, family);
      continue;
    }
    const prefix = Number(prefixText);
    if (Number.isInteger(prefix) && prefix >= 0 && prefix <= (version === 6 ? 128 : 32)) {
      list.addSubnet(address, prefix, family);
    }
  }
  return list;
}

/** One lookup in flight at a time; a failure caches "no proxy" for the TTL. */
function resolveProxyAddresses(): Promise<TrustedProxyCache> {
  pendingLookup ??= lookup(TRUSTED_PROXY_HOSTNAME, { all: true })
    .then((entries) => new Set(entries.map((entry) => stripMappedPrefix(entry.address))))
    .catch(() => new Set<string>())
    .then((addresses) => {
      proxyCache = { addresses, resolvedAt: Date.now() };
      pendingLookup = null;
      return proxyCache;
    });
  return pendingLookup;
}

function stripMappedPrefix(address: string): string {
  const lower = address.toLowerCase();
  const unmapped = lower.slice(IPV4_MAPPED_IPV6_PREFIX.length);
  return lower.startsWith(IPV4_MAPPED_IPV6_PREFIX) && isIP(unmapped) === 4 ? unmapped : lower;
}
