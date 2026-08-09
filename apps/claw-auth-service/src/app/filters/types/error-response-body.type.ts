export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
  errorCode?: string;
  errors?: unknown[];
  timestamp: string;
}
