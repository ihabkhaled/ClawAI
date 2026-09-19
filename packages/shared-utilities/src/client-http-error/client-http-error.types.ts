/**
 * The shape Express middleware (body-parser and anything else built on
 * `http-errors`) throws for a bad request body, before Nest sees the request.
 */
export interface ClientHttpError extends Error {
  readonly status: number;
  readonly expose: boolean;
}
