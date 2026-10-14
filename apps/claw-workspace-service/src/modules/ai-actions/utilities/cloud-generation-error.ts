const PROVIDER_STATUS_IN_BODY = /returned (?:status )?(\d{3})/;

/**
 * A non-2xx answer from chat-service. `message` carries only the HTTP status;
 * the body is kept for logs and status detection, never shown to users.
 * chat-service wraps a provider 404 in its own 400, so the provider status named
 * in the body wins when present.
 */
export class CloudGenerationError extends Error {
  readonly status: number;
  readonly effectiveStatus: number;

  constructor(status: number, body: string) {
    super(`Cloud generation failed (HTTP ${String(status)})`);
    this.name = 'CloudGenerationError';
    this.status = status;
    const inner = PROVIDER_STATUS_IN_BODY.exec(body)?.[1];
    this.effectiveStatus = inner === undefined ? status : Number(inner);
  }
}
