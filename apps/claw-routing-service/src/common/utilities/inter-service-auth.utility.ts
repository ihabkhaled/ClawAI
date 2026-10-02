import { AppConfig } from '../../app/config/app.config';

/**
 * The `Authorization` value sibling services' service-token lanes expect
 * (`Service <INTER_SERVICE_AUTH_TOKEN>`). Mirrors chat-service's
 * `buildInterServiceAuthHeader`; no new env var.
 *
 * ADR-144: ollama-service `POST /ollama/generate` and every
 * `/internal/ollama/*` + `/internal/llamacpp/*` route now refuse an anonymous
 * call with 401, so every routing → ollama/llama.cpp hop must send this.
 */
export function buildInterServiceAuthHeader(): string {
  return `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}`;
}
