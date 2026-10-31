/** Why a research gateway call produced nothing (ADR-212). Mapped once, in the gateway. */
export enum ResearchGatewayFailure {
  /** The gateway's own deadline passed (always later than research-service's bound). */
  TIMEOUT = 'TIMEOUT',
  /** research-service answered with a non-2xx status. */
  HTTP_ERROR = 'HTTP_ERROR',
  /** The call threw before any answer (connection refused, bad body). */
  EXCEPTION = 'EXCEPTION',
  /** The service-token run route answered nothing usable (already logged by the client). */
  UNAVAILABLE = 'UNAVAILABLE',
}
