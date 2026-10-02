import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import type { HostResolution, PinnedAddress } from '../types/ip-address.types';
import { isMetadataIp, isNonPublicIp } from './ip-address.utility';

/**
 * The DNS half of the SSRF guard (TD-031).
 *
 * The syntactic check in `assertSafeOutboundUrl` cannot see where a NAME
 * points. This resolves the host ONCE, refuses it when ANY answer is
 * non-public (an attacker's name can return one public and one private
 * record), and hands back the address that was checked. The caller connects to
 * THAT address (see `pinnedFetch`), so the name is never re-resolved between
 * the check and the connect — which is the whole DNS-rebinding attack.
 */

async function osResolve(host: string): Promise<PinnedAddress[]> {
  const answers = await lookup(host, { all: true, verbatim: true });
  const pinned: PinnedAddress[] = [];
  for (const answer of answers) {
    if (answer.family === 4 || answer.family === 6) {
      pinned.push({ address: answer.address, family: answer.family });
    }
  }
  return pinned;
}

/** Tests replace `resolve`; nothing in production code does. */
export const hostResolution: HostResolution = { resolve: osResolve };

function stripBrackets(host: string): string {
  return host.replace(/^\[/u, '').replace(/\]$/u, '');
}

/**
 * Resolves `host` once and returns the validated address to connect to.
 *
 * `allowPrivate` is the operator-allowlist escape hatch: it admits private
 * ranges but NEVER a metadata endpoint.
 */
export async function resolvePinnedAddress(
  host: string,
  options: { allowPrivate: boolean },
): Promise<PinnedAddress> {
  const bare = stripBrackets(host);
  const literalFamily = isIP(bare);
  const answers: PinnedAddress[] =
    literalFamily === 4 || literalFamily === 6
      ? [{ address: bare, family: literalFamily }]
      : await hostResolution.resolve(bare);
  const first = answers[0];
  if (first === undefined) {
    throw new Error(`Host ${bare} did not resolve to any address`);
  }
  for (const answer of answers) {
    if (isMetadataIp(answer.address)) {
      throw new Error(`Host ${bare} resolves to a cloud-metadata endpoint`);
    }
    if (!options.allowPrivate && isNonPublicIp(answer.address)) {
      throw new Error(`Host ${bare} resolves to a private/loopback address`);
    }
  }
  return first;
}
