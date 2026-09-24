/** The only part of a request `ServiceTokenGuard` reads. */
export type ServiceTokenRequest = {
  headers: Record<string, string | undefined>;
};
