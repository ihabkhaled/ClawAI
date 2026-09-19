import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/constants';
import { bearerTokenOf, refreshSession } from '@/lib/session-refresh';
import { clearAuthStorage, getAccessToken, isAuthRefreshExemptPath } from '@/utilities';

function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add correlation ID for request tracing across services
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Only attempt refresh on 401 and not already retried
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // Some requests must never be able to sign the user out. The auth
      // endpoints themselves (a failed login retried through a refresh is a
      // loop) and telemetry (best-effort background traffic the user did not
      // ask for, which must not hold the authority to clear storage and
      // redirect).
      const url = originalRequest.url ?? '';
      if (isAuthRefreshExemptPath(url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      // A refresh that could not even be attempted (offline, 5xx) rejects
      // here with its own error: the request fails, the session stays.
      const token = await refreshSession(bearerTokenOf(originalRequest.headers.Authorization));
      if (token === null) {
        clearAuthStorage();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return client(originalRequest);
    },
  );

  return client;
}

export const httpClient = createHttpClient();
