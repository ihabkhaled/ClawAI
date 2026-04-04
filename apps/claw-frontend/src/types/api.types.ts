import type { HttpMethod } from "@/enums";

export type ApiRequestConfig = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
};

export type ApiError = {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
};
