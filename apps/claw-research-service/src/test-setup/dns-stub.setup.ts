import type { PinnedAddress } from '../common/types/ip-address.types';
import { hostResolution } from '../common/utilities/dns-guard.utility';

/**
 * Unit tests never touch real DNS: every hostname resolves to one documented
 * public address unless a spec installs its own resolver (TD-031 specs do).
 */
hostResolution.resolve = (): Promise<PinnedAddress[]> =>
  Promise.resolve([{ address: '93.184.216.34', family: 4 }]);
