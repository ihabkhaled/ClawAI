export const OLLAMA_PROVIDER = 'local-ollama';

export const OLLAMA_CONNECTOR_PROVIDER = 'OLLAMA';

export const LLAMACPP_PROVIDER = 'local-llamacpp';

export const LLAMACPP_CONNECTOR_PROVIDER = 'LLAMACPP';

// Cloud provider identifiers used by the chat-execution dispatcher to opt
// individual providers into native request shapes (Anthropic Messages API,
// Gemini generateContent + Files API). Identical to the `provider` value
// that flows through MessageRoutedData.selectedProvider.
export const ANTHROPIC_PROVIDER = 'ANTHROPIC';

export const GEMINI_PROVIDER = 'GEMINI';

export const GEMINI_VIDEO_DEFAULT_MODEL = 'gemini-2.5-flash';

export const GEMINI_VIDEO_CAPABLE_MODELS = new Set([GEMINI_VIDEO_DEFAULT_MODEL, 'gemini-2.5-pro']);

export const GEMINI_OPENAI_COMPATIBILITY_SUFFIX = '/openai';

export const VIDEO_MIME_PREFIX = 'video/';

export const IMAGE_PROVIDER_PREFIX = 'IMAGE_';

export const FILE_GENERATION_PROVIDER = 'FILE_GENERATION';

/**
 * DEPRECATED as a context rule. Kept only as the Runtime V2 tool-trail window.
 *
 * This was the whole conversational memory of the product: `assemble` sliced
 * the thread to the last twenty messages and everything downstream cut further.
 * Conversational history is now selected by ContextComposerManager against a
 * real token budget — see ADR-086. Do not reintroduce a message-count rule.
 */
export const THREAD_CONTEXT_LIMIT = 20;

/**
 * How many rows are read from the database for one generation.
 *
 * Not a context rule — a read cap. The composer decides what of this reaches
 * the model. It was 20, applied at the query, so a hundred-message thread had
 * eighty messages that no amount of budget could recover: they were never
 * loaded. Four hundred rows of a single indexed thread is a cheap read and
 * covers a very long conversation; beyond it, hierarchical summaries (Batch 2)
 * take over rather than an ever-larger SELECT.
 */
export const THREAD_HISTORY_FETCH_LIMIT = 400;

export const MEMORY_FETCH_LIMIT = 20;

/**
 * How many *topical* memories may reach the prompt.
 *
 * Topical means a fact or a summary — something relevant only when the question
 * is about it. Standing memories (an instruction, a preference) are not counted
 * here and are never dropped: an instruction that applies "only when you happen
 * to ask about it" is not an instruction.
 *
 * The previous cap was 3, applied to every kind at once, so five saved facts
 * reached the model as three and a standing instruction could be crowded out by
 * unrelated facts.
 */
export const PROMPT_TOPICAL_MEMORY_LIMIT = 8;

/**
 * Minimum lexical overlap for a topical memory to be considered relevant.
 *
 * Only ever applied to topical memories. Applying it to a standing instruction
 * was the bug: "always end every reply with X" shares no vocabulary with "what
 * is a database index", so the instruction was silently dropped from every
 * prompt that did not happen to talk about instructions.
 */
export const TOPICAL_MEMORY_OVERLAP_THRESHOLD = 0.28;

export const WORKSPACE_CONTEXT_LIMIT = 5;

export const APPROX_CHARS_PER_TOKEN = 4;

export const LOCAL_ONLY_ROUTING_MODES = new Set(['LOCAL_ONLY', 'PRIVACY_FIRST']);

// Connector provider tokens that may appear as the explicit `provider` half of a
// user-chosen judge model string ("PROVIDER:model"). Used by parseJudgeModel to
// recognize whether the leading segment is a real provider (so it is routed
// through callProvider) vs. part of the model name (e.g. "gpt-4o:latest").
// All compared case-insensitively against the upper-cased segment.
export const KNOWN_JUDGE_PROVIDERS = new Set([
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'AWS_BEDROCK',
  'DEEPSEEK',
  'GROK',
  OLLAMA_CONNECTOR_PROVIDER,
  LLAMACPP_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
  LLAMACPP_PROVIDER,
]);

export const PROVIDER_BASE_URLS: Record<string, string> = {
  OPENAI: 'https://api.openai.com/v1',
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta/openai',
  DEEPSEEK: 'https://api.deepseek.com/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1',
  GROK: 'https://api.x.ai/v1',
  OLLAMA: 'https://ollama.com/api',
  // LLAMACPP entries are reached via callLlamacpp() using LLAMACPP_SERVICE_URL,
  // not via the cloud provider base-URL flow. Listed here for documentation symmetry.
  LLAMACPP: 'http://llamacpp-service:4017/api/v1/v1',
};

/**
 * How long to wait for auth-service to answer an entitlement lookup.
 *
 * Explicit rather than inherited so the number is visible at the call site.
 * Measured against the running stack at concurrency 12: p50 17ms, p95 41ms,
 * max 65ms, zero failures — five seconds is already three orders of magnitude
 * of headroom, and raising it would only make a real outage take longer to
 * surface. The intermittent 503s were NOT timeouts.
 */
export const ENTITLEMENTS_TIMEOUT_MS = 5_000;
