export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
  errors?: unknown[];
  timestamp: string;
}
