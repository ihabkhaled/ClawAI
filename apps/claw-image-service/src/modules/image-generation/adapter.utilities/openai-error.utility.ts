/**
 * The provider's own explanation for a refusal, or the transport error.
 *
 * Reaches into the axios error shape rather than through the shared wrapper
 * because the wrapper returns `response.data` and drops the error body — which
 * is the only place OpenAI puts the reason.
 */
export function extractOpenAIErrorMessage(error: unknown): string {
  const body = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data;
  const message = body?.error?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return error instanceof Error ? error.message : 'unknown error';
}
