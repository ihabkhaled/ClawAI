/**
 * The classifier that decides whether a turn needs the web at all.
 *
 * Small and fast on purpose: it runs BEFORE every answer, so its latency is
 * paid on messages that need nothing. It returns one JSON object and no prose.
 */
export const RESEARCH_GATE_SYSTEM_PROMPT = `You decide whether answering a user's message requires looking something up on the internet. You do NOT answer the message.

Reply with ONE JSON object and nothing else:
{"needsWeb": boolean, "reason": string}

needsWeb = true ONLY when the answer depends on information you cannot be expected to hold:
- current events, news, prices, scores, weather, "today", "latest", "right now"
- a specific named page, product, repository, or document the user wants read
- facts that change often (versions, releases, availability, who currently holds a role)
- the user explicitly asks you to search, browse, or cite sources

needsWeb = false for everything else, including:
- greetings, small talk, "test", "hi", thanks
- writing, rewriting, summarising, translating text the user supplied
- code the user pasted, debugging, refactoring, explaining an error
- explanations of stable concepts, definitions, maths, how something works
- opinions, brainstorming, planning, roleplay
- follow-ups about the conversation itself

When genuinely unsure, answer false. A missing search costs an ordinary answer; an unnecessary one spends the user's search allowance and delays every reply.

Return ONLY the JSON object. No preamble. No code fence.`;

/** A gate that takes longer than this is worse than no gate. */
export const RESEARCH_GATE_TIMEOUT_MS = 6_000;

/**
 * Enough for one small JSON object; anything longer is the model misbehaving.
 *
 * Only safe because the request disables thinking. A reasoning model with
 * thinking on spends this entire budget before it writes a single character of
 * the answer.
 */
export const RESEARCH_GATE_MAX_TOKENS = 64;

/**
 * How long one verdict stays reusable.
 *
 * The same message reaches the gate twice in a turn: once where research is
 * started, once again in context assembly for the flows that go there. The
 * window only has to outlive a single turn, so it is short enough that a
 * repeated question later still gets a fresh reading.
 */
export const RESEARCH_GATE_CACHE_TTL_MS = 60_000;

/** Entries kept before the oldest is dropped. */
export const RESEARCH_GATE_CACHE_MAX_ENTRIES = 500;

/** Where the configured candidates come from. */
export const RESEARCH_GATE_CANDIDATES_PATH =
  '/api/v1/internal/assistant-models/RESEARCH_GATE/candidates';

/**
 * How long the candidate list is reused.
 *
 * Long enough that the gate does not fetch configuration on every message,
 * short enough that an admin changing the model on the Smart Router page sees
 * it take effect without a restart.
 */
export const RESEARCH_GATE_CANDIDATES_TTL_MS = 60_000;

/** A configuration lookup must not cost more than the classifier call itself. */
export const RESEARCH_GATE_CANDIDATES_TIMEOUT_MS = 3_000;
