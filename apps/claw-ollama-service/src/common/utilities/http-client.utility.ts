import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { Logger } from '@nestjs/common';
import { DEFAULT_HTTP_TIMEOUT } from '../constants';

const logger = new Logger('HttpClient');

export type { AxiosInstance } from 'axios';

export function createHttpClient(config: AxiosRequestConfig): AxiosInstance {
  logger.debug('createHttpClient: creating new axios instance');
  return axios.create(config);
}

export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  logger.debug(`httpGet: GET ${url}`);
  const startTime = Date.now();
  const response: AxiosResponse<T> = await axios.get(url, {
    timeout: DEFAULT_HTTP_TIMEOUT,
    ...config,
  });
  const durationMs = Date.now() - startTime;
  logger.debug(`httpGet: GET ${url} completed — status=${String(response.status)} durationMs=${String(durationMs)}`);
  return response.data;
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  logger.debug(`httpPost: POST ${url}`);
  const startTime = Date.now();
  const response: AxiosResponse<T> = await axios.post(url, data, {
    timeout: DEFAULT_HTTP_TIMEOUT,
    ...config,
  });
  const durationMs = Date.now() - startTime;
  logger.debug(`httpPost: POST ${url} completed — status=${String(response.status)} durationMs=${String(durationMs)}`);
  return response.data;
}
