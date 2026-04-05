import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { DEFAULT_HTTP_TIMEOUT } from '../constants';

export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await axios.get(url, {
    timeout: DEFAULT_HTTP_TIMEOUT,
    ...config,
  });
  return response.data;
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response: AxiosResponse<T> = await axios.post(url, data, {
    timeout: DEFAULT_HTTP_TIMEOUT,
    ...config,
  });
  return response.data;
}
