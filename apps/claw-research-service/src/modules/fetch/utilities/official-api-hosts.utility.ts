import {
  OFFICIAL_API_FIXED_HOSTS,
  WIKIPEDIA_HOST_SUFFIX,
} from '../constants/official-api.constants';

/**
 * The hosts one official-API call may reach: the fixed API hosts, plus the
 * Wikipedia language edition when (and only when) the URL is one — so a
 * resolver bug can never widen the list to an arbitrary host.
 */
export function officialApiAllowedHosts(apiUrl: string): ReadonlySet<string> {
  const hosts = new Set(OFFICIAL_API_FIXED_HOSTS);
  try {
    const host = new URL(apiUrl).host.toLowerCase();
    if (host.endsWith(WIKIPEDIA_HOST_SUFFIX)) {
      hosts.add(host);
    }
  } catch {
    // An unparseable URL adds nothing; the guard then refuses it.
  }
  return hosts;
}
