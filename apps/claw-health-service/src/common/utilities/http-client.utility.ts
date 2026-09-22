import { type AxiosRequestConfig } from 'axios';
import { httpGet as httpGetShared, httpPost as httpPostShared } from '@claw/shared-utilities';

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
