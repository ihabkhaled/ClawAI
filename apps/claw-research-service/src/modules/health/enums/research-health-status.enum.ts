/**
 * research-service `/health` top-level `status`. DEGRADED means an ENABLED
 * scraping sidecar is not answering: research still works (the escalation
 * chain skips that tier), so it is never reported as down and the HTTP
 * status stays 200.
 */
export enum ResearchHealthStatus {
  OK = 'ok',
  DEGRADED = 'degraded',
}
