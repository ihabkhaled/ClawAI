export type MiddlewareHttpError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};
