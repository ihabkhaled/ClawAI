import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

const DEFAULT_TIMEOUT = 5000;

export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await axios.get(url, { timeout: DEFAULT_TIMEOUT, ...config });
  return response.data;
}

export async function httpPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await axios.post(url, data, { timeout: DEFAULT_TIMEOUT, ...config });
  return response.data;
}
