import { AppConfig } from '../../app/config/app.config';

/**
 * Stream 22 — builds the `Authorization` header value that file-service's
 * `ServiceTokenGuard` (and other service-to-service guards) expect.
 *
 * Pattern mirrors `apps/claw-workspace-service/src/common/utilities/
 * file-service-client.utility.ts#buildAuthHeader`. We do NOT introduce a new
 * env var — `INTER_SERVICE_AUTH_TOKEN` is the canonical shared secret across
 * file-service / workspace-service / chat-service / image-service /
 * file-generation-service (all read from the same root `.env`).
 *
 * Callers MUST pass this as the `Authorization` header on every request to
 * file-service's guarded `/api/v1/internal/files/*` routes.
 */
export function buildInterServiceAuthHeader(): string {
  return `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}`;
}
