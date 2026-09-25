/**
 * A clamd socket failure that carries only a stable `code` (ETIMEDOUT,
 * CLAMAV_EMPTY_REPLY, …), never a host or IP, so it is safe to log verbatim.
 */
export class ClamavSocketError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ClamavSocketError';
    this.code = code;
  }
}
