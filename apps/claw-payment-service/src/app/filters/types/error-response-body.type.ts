export type ErrorResponseBody = {
  statusCode: number;
  message: string;
  timestamp: string;
  code?: string;
  errors?: unknown[];
};
