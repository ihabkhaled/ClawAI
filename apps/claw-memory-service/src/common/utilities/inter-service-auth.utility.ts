import { AppConfig } from '../../app/config/app.config';

/**
 * The `Authorization` value sibling services' service-token lanes expect
 * (`Service <INTER_SERVICE_AUTH_TOKEN>`). No new env var.
 *
 * ADR-144: ollama-service `POST /ollama/generate` and `/internal/ollama/*`
 * refuse an anonymous call with 401, so memory extraction and the
 * sensitivity classifier send this on every hop.
 */
export function buildInterServiceAuthHeader(): string {
  return `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}`;
}
