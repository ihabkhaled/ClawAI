import { CloudGenerationError } from './cloud-generation-error';

export type UpstreamFailureCode =
  | 'UPSTREAM_AUTH_FAILED'
  | 'UPSTREAM_PAYMENT_REQUIRED'
  | 'UPSTREAM_MODEL_NOT_FOUND'
  | 'UPSTREAM_RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_BAD_REQUEST'
  | 'UPSTREAM_ERROR';

export type UpstreamFailure = { code: UpstreamFailureCode; message: string };

function plainMessage(code: UpstreamFailureCode): string {
  switch (code) {
    case 'UPSTREAM_AUTH_FAILED':
      return 'The AI service rejected this request.';
    case 'UPSTREAM_PAYMENT_REQUIRED':
      return 'This model is not covered by your plan or credit.';
    case 'UPSTREAM_MODEL_NOT_FOUND':
      return 'This model is not available.';
    case 'UPSTREAM_RATE_LIMITED':
      return 'The model is busy. Try again in a moment.';
    case 'UPSTREAM_TIMEOUT':
      return 'The model took too long to answer.';
    case 'UPSTREAM_UNAVAILABLE':
      return 'The model is temporarily unavailable.';
    case 'UPSTREAM_BAD_REQUEST':
      return 'The model could not handle this request.';
    case 'UPSTREAM_ERROR':
      return 'The model could not answer.';
  }
}

const HTTP_STATUS_IN_MESSAGE = /\(HTTP (\d{3})\)/;

function codeForStatus(status: number): UpstreamFailureCode {
  if (status === 401 || status === 403) return 'UPSTREAM_AUTH_FAILED';
  if (status === 402) return 'UPSTREAM_PAYMENT_REQUIRED';
  if (status === 404) return 'UPSTREAM_MODEL_NOT_FOUND';
  if (status === 408 || status === 504) return 'UPSTREAM_TIMEOUT';
  if (status === 429) return 'UPSTREAM_RATE_LIMITED';
  if (status === 503 || status === 502) return 'UPSTREAM_UNAVAILABLE';
  return status >= 400 && status < 500 ? 'UPSTREAM_BAD_REQUEST' : 'UPSTREAM_ERROR';
}

function statusOf(error: unknown): number | null {
  if (error instanceof CloudGenerationError) return error.effectiveStatus;
  const match = error instanceof Error ? HTTP_STATUS_IN_MESSAGE.exec(error.message) : null;
  return match?.[1] === undefined ? null : Number(match[1]);
}

/**
 * Turns any failure from a provider call into a short plain message and a
 * stable code. Never echoes the upstream body: chat-service and provider JSON
 * stays in the logs.
 */
export function describeUpstreamFailure(error: unknown): UpstreamFailure {
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return { code: 'UPSTREAM_TIMEOUT', message: plainMessage('UPSTREAM_TIMEOUT') };
  }
  const status = statusOf(error);
  const code = status === null ? 'UPSTREAM_ERROR' : codeForStatus(status);
  return { code, message: plainMessage(code) };
}
