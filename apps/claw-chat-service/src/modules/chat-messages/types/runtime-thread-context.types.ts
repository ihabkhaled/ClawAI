/**
 * What a runtime run needs to know about its thread to assemble context.
 *
 * Narrower than `ChatThread` on purpose: the loop reads these four fields and
 * nothing else, and a wide type invited the previous shape — `{ contextPackIds
 * }` — which silently dropped the user's cross-thread setting.
 */
export interface RuntimeThreadContext {
  readonly contextPackIds?: string[] | null;
  readonly useCrossThreadContext?: boolean | null;
  readonly systemPrompt?: string | null;
}

/**
 * The part of a message the attachment lookup reads.
 *
 * Structural rather than the full `ChatMessage`, so a caller — and a test —
 * can supply exactly these two fields without a cast.
 */
export interface RuntimeHistoryMessage {
  readonly role: string;
  readonly metadata?: unknown;
}
