import { type AxiosRequestConfig } from 'axios';
import { httpGet as httpGetShared, httpPost as httpPostShared } from '@claw/shared-utilities';

/**
 * Service-local typed wrapper around the shared axios HTTP client.
 * Keeps the existing import surface (`@common/utilities`) while delegating
 * the actual axios call to `@claw/shared-utilities` so the axios library
 * is wrapped exactly once across the monorepo.
 */
export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return httpGetShared<T>(url, config);
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return httpPostShared<T>(url, data, config);
}
