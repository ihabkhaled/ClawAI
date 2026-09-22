import { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  assertSafeRequestUrl,
  createHttpClient as createSharedHttpClient,
  httpGet as httpGetShared,
  httpPost as httpPostShared,
} from '@claw/shared-utilities';
import { DEFAULT_HTTP_TIMEOUT } from '../constants';

export type { AxiosInstance } from 'axios';

/**
 * Service-local typed wrapper around the shared axios HTTP client.
 *
 * Keeps the existing import surface (`@common/utilities`) while delegating the
 * actual axios call to `@claw/shared-utilities`, so the SSRF chokepoint
 * (`assertSafeRequestUrl`, CodeQL js/request-forgery alert #58) runs on every
 * request this service makes.
 *
 * The shared host allowlist is UNCONDITIONAL: this process's `*_SERVICE_URL` /
 * `*_BASE_URL` / `*_API_URL` / `*_ENDPOINT` hosts, plus the small
 * `EXTERNAL_ENDPOINT_HOSTS` constant, plus whatever a caller declares. A
 * destination that is neither — ollama.com's registry, HuggingFace weights, a
 * ComfyUI runtime — must be declared at the construction site with
 * `declaredHost(<base url>)` or it is refused.
 *
 * Timeout: this service's `DEFAULT_HTTP_TIMEOUT` is 5000ms, the shared one is
 * 30_000ms. `httpGet`/`httpPost` below pass the local value explicitly ahead of
 * the caller's config, so the shared default never applies and the local
 * behaviour is preserved.
 */

/**
 * Resolve what axios will actually open for a request, so the guard sees the
 * real destination rather than the instance's construction-time baseURL.
 *
 * This matters: `ollama-library-discovery.manager` overrides `baseURL` PER
 * REQUEST from an operator-configured discovery-source row, so a
 * construction-time check alone would be checking a URL that is never called.
 */
function resolveRequestUrl(baseUrl: string | undefined, path: string | undefined): string {
  const requestPath = path ?? '';
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(requestPath);
  return isAbsolute || baseUrl === undefined || baseUrl === '' ? requestPath : `${baseUrl.replace(/\/+$/, '')}/${requestPath.replace(/^\/+/, '')}`;
}

/**
 * An axios instance whose destination is checked.
 *
 * `axios.create` is not guarded by anything in either the local or the shared
 * client — it just builds an instance — so this wrapper adds the guard in two
 * places:
 *
 *  1. At construction, on `config.baseURL`, so a misconfigured instance fails
 *     where it is built instead of at the first call.
 *  2. In a request interceptor, on the resolved `baseURL + url`, so a
 *     per-request `baseURL` override is checked too.
 *
 * Redirect behaviour is deliberately left as axios ships it (the shared
 * `createHttpClient` does the same). `httpGet`/`httpPost` set `maxRedirects: 0`;
 * instances do not, because the ollama registry answers manifest reads with
 * redirects. A redirect target is therefore NOT re-checked by this guard.
 */
export function createHttpClient(
  config: AxiosRequestConfig,
  allowedHosts?: ReadonlySet<string>,
): AxiosInstance {
  if (config.baseURL !== undefined && config.baseURL !== '') {
    assertSafeRequestUrl(config.baseURL, allowedHosts);
  }
  const instance = createSharedHttpClient(config);
  instance.interceptors.request.use((requestConfig) => {
    assertSafeRequestUrl(resolveRequestUrl(requestConfig.baseURL, requestConfig.url), allowedHosts);
    return requestConfig;
  });
  return instance;
}

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
