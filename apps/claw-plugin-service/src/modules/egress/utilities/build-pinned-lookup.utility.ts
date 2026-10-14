import type { LookupFunction } from 'node:net';

import { type PinnedAddress } from '../types/egress.types';

/**
 * A socket `lookup` hook that answers every name with the addresses already validated, so the
 * TCP connection goes where the check looked and a DNS answer that changes in between (rebinding)
 * is never consulted. With `autoSelectFamily` the socket tries them in order (Happy Eyeballs), so
 * one unreachable address does not fail the call. SNI, the Host header and certificate
 * verification keep using the real host name.
 */
export function buildPinnedLookup(pinned: readonly PinnedAddress[]): LookupFunction {
  return (_hostname, options, callback): void => {
    const first = pinned[0];
    if (first === undefined) {
      callback(new Error('no validated address'), '', 4);
      return;
    }
    if (options.all === true) {
      callback(
        null,
        pinned.map((entry) => ({ address: entry.address, family: entry.family })),
      );
      return;
    }
    callback(null, first.address, first.family);
  };
}
