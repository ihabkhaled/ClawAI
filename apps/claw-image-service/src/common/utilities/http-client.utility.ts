import { type AxiosRequestConfig } from 'axios';
import {
  assertSafeRequestUrl,
  createHttpClient,
  httpGet as httpGetShared,
  httpPost as httpPostShared,
} from '@claw/shared-utilities';
import { DEFAULT_HTTP_TIMEOUT } from '../constants';

/**
 * Service-local typed wrapper around the shared axios HTTP client.
 *
 * This file used to hold its OWN `axios.get`/`axios.post` calls, which meant
 * every image-service request skipped the SSRF chokepoint in
 * `assertSafeRequestUrl` entirely (TD-038). It now delegates so the axios
 * library is wrapped exactly once across the monorepo and the guard applies:
 * protocol, embedded credentials, cloud metadata, and the unconditional host
 * allowlist.
 *
 * `allowedHosts` is the escape hatch the guard expects: a caller whose URL
 * comes from an admin-configured connector base URL passes
 * `declaredHost(baseUrl)` so the destination is an explicit argument at the
 * call site rather than something the guard waves past.
 *
 * The local `DEFAULT_HTTP_TIMEOUT` is 5000 ms; the shared client's is 30_000 ms.
 * The shared client spreads the caller's `config` AFTER its own default, so
 * seeding `config` with the local value here preserves image-service's shorter
 * timeout, and a caller that passes its own `timeout` still wins.
 */
export type { AxiosInstance } from '@claw/shared-utilities';
export { createHttpClient } from '@claw/shared-utilities';

export async function httpGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): Promise<T> {
  return httpGetShared<T>(url, { timeout: DEFAULT_HTTP_TIMEOUT, ...config }, allowedHosts);
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): Promise<T> {
  return httpPostShared<T>(url, data, { timeout: DEFAULT_HTTP_TIMEOUT, ...config }, allowedHosts);
}

/**
 * DELETE through the same SSRF chokepoint. `@claw/shared-utilities` has no
 * `httpDelete`, so this checks the URL with the shared guard and sends through
 * a shared-client axios instance, with the same no-redirect rule the shared
 * helpers apply. Resolves on any status `config.validateStatus` accepts.
 */
export async function httpDelete(
  url: string,
  config?: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): Promise<void> {
  assertSafeRequestUrl(url, allowedHosts);
  await createHttpClient({ timeout: DEFAULT_HTTP_TIMEOUT, maxRedirects: 0 }).delete(url, config);
}
