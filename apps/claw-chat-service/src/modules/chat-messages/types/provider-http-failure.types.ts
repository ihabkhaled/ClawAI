/** A non-2xx provider response, as every provider hop in chat-service sees it. */
export type ProviderHttpFailureInput = {
  status: number;
  /** Parsed JSON (buffered hops) or raw text (the streaming hop). */
  body: unknown;
  /** The code a non-credit failure keeps, so existing callers' codes do not change. */
  failureCode: string;
  /** Shown when the provider gave no sentence that is safe to repeat. */
  fallbackMessage: string;
};
