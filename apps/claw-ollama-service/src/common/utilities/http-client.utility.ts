import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type { AxiosInstance } from "axios";

const DEFAULT_TIMEOUT = 5000;

export function createHttpClient(config: AxiosRequestConfig): AxiosInstance {
  return axios.create(config);
}

export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await axios.get(url, { timeout: DEFAULT_TIMEOUT, ...config });
  return response.data;
}

export async function httpPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await axios.post(url, data, { timeout: DEFAULT_TIMEOUT, ...config });
  return response.data;
}
