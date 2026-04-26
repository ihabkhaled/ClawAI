import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { Logger } from '@nestjs/common';
import { DEFAULT_HTTP_TIMEOUT } from '@claw/shared-constants';

const logger = new Logger('AxiosHttpClient');

export type { AxiosInstance } from 'axios';

export function createHttpClient(config: AxiosRequestConfig): AxiosInstance {
  logger.debug('createHttpClient: creating new axios instance');
  return axios.create(config);
}

export async function httpGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  logger.debug(`httpGet: GET ${url}`);
  const startTime = Date.now();
  try {
    const response: AxiosResponse<T> = await axios.get(url, {
      timeout: DEFAULT_HTTP_TIMEOUT,
      ...config,
    });
    const durationMs = Date.now() - startTime;
    logger.log(
      `httpGet: GET ${url} ok status=${String(response.status)} durationMs=${String(durationMs)}`,
    );
    return response.data;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(`httpGet: GET ${url} failed after ${String(durationMs)}ms — ${message}`);
    throw error;
  }
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  logger.debug(`httpPost: POST ${url}`);
  const startTime = Date.now();
  try {
    const response: AxiosResponse<T> = await axios.post(url, data, {
      timeout: DEFAULT_HTTP_TIMEOUT,
      ...config,
    });
    const durationMs = Date.now() - startTime;
    logger.log(
      `httpPost: POST ${url} ok status=${String(response.status)} durationMs=${String(durationMs)}`,
    );
    return response.data;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(`httpPost: POST ${url} failed after ${String(durationMs)}ms — ${message}`);
    throw error;
  }
}
