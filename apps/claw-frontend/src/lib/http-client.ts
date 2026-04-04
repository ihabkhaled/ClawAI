import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants';
import { getAccessToken } from '@/utilities';

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
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Do NOT redirect on 401 here. The useAuthGuard hook handles
      // auth state and redirects. Redirecting here aborts all in-flight
      // requests and causes net::ERR_FAILED on other concurrent calls.
      return Promise.reject(error);
    },
  );

  return client;
}

export const httpClient = createHttpClient();
