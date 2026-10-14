import type { LookupFunction } from 'node:net';

import { type PinnedAddress } from '../types/egress.types';

/**
 * A socket `lookup` hook that answers every name with the one address already validated, so the
 * TCP connection goes where the check looked and a DNS answer that changes in between (rebinding)
 * is never consulted. SNI, the Host header and certificate verification keep using the real host name.
 */
export function buildPinnedLookup(pinned: PinnedAddress): LookupFunction {
  return (_hostname, options, callback): void => {
    if (options.all === true) {
      callback(null, [{ address: pinned.address, family: pinned.family }]);
      return;
    }
    callback(null, pinned.address, pinned.family);
  };
}
