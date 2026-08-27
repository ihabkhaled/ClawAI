import { RoutingMode, MessageRole } from '@/enums';

export const ROUTING_MODE_LABELS: Record<RoutingMode, string> = {
  [RoutingMode.AUTO]: 'Auto',
  [RoutingMode.MANUAL_MODEL]: 'Manual',
  [RoutingMode.LOCAL_ONLY]: 'Local Only',
  [RoutingMode.PRIVACY_FIRST]: 'Privacy First',
  [RoutingMode.LOW_LATENCY]: 'Low Latency',
  [RoutingMode.HIGH_REASONING]: 'High Reasoning',
  [RoutingMode.COST_SAVER]: 'Cost Saver',
};

export const MESSAGE_ROLE_LABELS: Record<MessageRole, string> = {
  [MessageRole.SYSTEM]: 'System',
  [MessageRole.USER]: 'You',
  [MessageRole.ASSISTANT]: 'Assistant',
  [MessageRole.TOOL]: 'Tool',
};

export const THINKING_INDICATOR_LABEL = 'AI is thinking...';
export const MODEL_AUTO_VALUE = '__auto__';
export const POLLING_INTERVAL_MS = 2000;
/**
 * Background refetch of the message list, and only while a response is in
 * flight.
 *
 * Slower than POLLING_INTERVAL_MS on purpose: the 2s interval is the belt, this
 * is the braces. The stream itself delivers the answer; both of these exist for
 * the case where the stream dropped and nobody noticed.
 */
export const MESSAGE_POLL_INTERVAL_MS = 5000;
export const MESSAGES_PAGE_SIZE = 50;
export const THREADS_PAGE_SIZE = 30;
export const COMPOSER_MIN_HEIGHT = 80;
export const COMPOSER_MAX_HEIGHT_RATIO = 0.5;
export const COMPOSER_DEFAULT_HEIGHT = 200;
export const VIRTUOSO_START_INDEX = 1_000_000;

// Thread-settings bounds. These MUST stay in step with the Zod schema in
// apps/claw-chat-service/src/modules/chat-threads/dto/update-thread.dto.ts —
// when they drift, the form posts a value the API rejects with a 400 and the
// user reads it as "Save does nothing".
export const THREAD_MAX_TOKENS_MIN = 1;
export const THREAD_MAX_TOKENS_MAX = 32000;
export const THREAD_QUALITY_THRESHOLD_MIN = 0;
export const THREAD_QUALITY_THRESHOLD_MAX = 1;
export const THREAD_MAX_REROUTE_ATTEMPTS_MIN = 0;
export const THREAD_MAX_REROUTE_ATTEMPTS_MAX = 5;

// Pixel threshold below which the chat scroll container is considered "at the
// bottom" — used by useStickyBottomScroll to decide whether to auto-follow
// streaming tokens. Matches the visual breathing room of the last message
// bubble; anything more would pin too eagerly when the user is reading.
export const STICKY_BOTTOM_THRESHOLD_PX = 80;

// Virtuoso `increaseViewportBy` for the VirtualizedMessages list. Pre-renders
// extra rows above so scrolling back to read recent history feels instant,
// and a smaller window below so the streaming footer + ThinkingIndicator
// stay mounted while the assistant types.
export const VIRTUALIZED_MESSAGES_VIEWPORT_BUFFER = { top: 1200, bottom: 200 } as const;

// ─── RichPromptTextarea (shared chat/compare prompt input) ──────────────────
// Default row bounds for the shared rich prompt textarea. The component
// auto-grows from RICH_PROMPT_DEFAULT_MIN_ROWS up to RICH_PROMPT_DEFAULT_MAX_ROWS
// (then scrolls internally). Parents may override via the minRows/maxRows props.
export const RICH_PROMPT_DEFAULT_MIN_ROWS = 2;
export const RICH_PROMPT_DEFAULT_MAX_ROWS = 12;

// localStorage key used to pass a seed prompt from /chat (suggested-prompt
// buttons) into the composer on the newly-created thread page. Written by
// use-chat-page.ts.handleSuggestedPrompt; consumed once on composer mount in
// use-message-composer-state.ts and immediately cleared.
export const COMPOSER_SEED_STORAGE_KEY = 'chat:nextComposerSeed';

/**
 * Per-thread composer drafts.
 *
 * One key per thread, not one shared key: a half-written message leaking from
 * one conversation into another is worse than losing it.
 */
export const COMPOSER_DRAFT_KEY_PREFIX = 'chat:draft:';

/**
 * Drafts longer than this are dropped rather than saved.
 *
 * localStorage is a small, shared, synchronous budget for the whole origin.
 * A pasted document in the composer is not worth spending it on, and a
 * QuotaExceededError here would break the composer for every thread.
 */
export const COMPOSER_DRAFT_MAX_LENGTH = 20_000;

/**
 * The draft key for a composer with no thread yet.
 *
 * The new-chat surface has no id to scope by, but a message typed there is
 * exactly the one worth not losing.
 */
export const NEW_THREAD_DRAFT_KEY = 'new';

/**
 * Shortest in-thread search term.
 *
 * A single character matches most of a conversation, so the result is a list
 * nobody can use rather than a search. Mirrors the backend DTO's minimum.
 */
export const IN_THREAD_SEARCH_MIN_LENGTH = 2;

/**
 * Rough per-token cost estimates (USD) for common providers.
 * Used only for display — not billing.
 */
export const ESTIMATED_COST_PER_INPUT_TOKEN: Record<string, number> = {
  openai: 0.000003,
  anthropic: 0.000003,
  gemini: 0.0000005,
  deepseek: 0.0000014,
  ollama: 0,
  grok: 0.000003,
};

/**
 * Maps backend quality-check reason codes to human-readable labels.
 * When the message bubble is i18n-ified, replace with `t(`chat.reRouteReason*`)`.
 */
export const RE_ROUTE_REASON_LABELS: Record<string, string> = {
  response_too_short: 'Too short',
  error_or_refusal_detected: 'Refusal detected',
  excessive_repetition: 'Excessive repetition',
  echo_response: 'Echo of prompt',
  too_few_words: 'Too few words',
};

export const ESTIMATED_COST_PER_OUTPUT_TOKEN: Record<string, number> = {
  openai: 0.000015,
  anthropic: 0.000015,
  gemini: 0.0000015,
  deepseek: 0.0000028,
  ollama: 0,
  grok: 0.000015,
};
