import { type AxiosRequestConfig } from 'axios';
import {
  declaredHost as declaredHostShared,
  httpGet as httpGetShared,
  httpPost as httpPostShared,
} from '@claw/shared-utilities';

/**
 * The host of a base URL, declared to the shared SSRF guard. Health-service
 * reads Prometheus, whose address is a compose service name rather than an
 * `*_SERVICE_URL` variable, so it names that destination at the call site.
 */
export function declaredHost(baseUrl: string): ReadonlySet<string> {
  return declaredHostShared(baseUrl);
}

/**
 * Service-local typed wrapper around the shared axios HTTP client.
 * Keeps the existing import surface (`@common/utilities`) while delegating
 * the actual axios call to `@claw/shared-utilities` so the axios library
 * is wrapped exactly once across the monorepo.
 *
 * `allowedHosts` is forwarded to the shared guard: a caller whose URL comes
 * from an admin-configured base URL rather than this process's environment
 * passes `declaredHost(baseUrl)` so the destination is an explicit argument at
 * the call site. Health-service's own targets are env-covered, but the
 * passthrough keeps the wrapper honest against the shared signature.
 */
export async function httpGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): Promise<T> {
  return httpGetShared<T>(url, config, allowedHosts);
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): Promise<T> {
  return httpPostShared<T>(url, data, config, allowedHosts);
}
