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

/**
 * The planner, which replaces the yes/no gate for AUTO research.
 *
 * It decides HOW to go to the web, not just whether: read the page the user
 * named, search, or read the site first and search only if that was not enough.
 * Its one-sentence `narration` is shown to the user as the first line of the
 * turn's work log, which is why it must be first-person and plain.
 */
export const RESEARCH_PLANNER_SYSTEM_PROMPT = `You plan how to answer a user's message before another AI answers it. You do NOT answer the message.

Reply with ONE JSON object and nothing else:
{"action": "answer" | "crawl" | "search" | "crawl_then_search", "urls": string[], "query": string | null, "maxPages": number, "narration": string}

action:
- "answer": no internet needed (greetings, writing, code, maths, stable knowledge, questions about the conversation).
- "crawl": the user named a website or page and the answer is on that site. Read it.
- "search": the answer needs current or specific information from the web, and no site was named.
- "crawl_then_search": a site was named AND the answer likely also needs the wider web (competitors, reviews, news about it, comparisons).

urls: every website the user mentioned, as full https URLs. [] when none.
query: a short web search query (under 12 words) when searching could be needed, else null. Never just copy the message.
maxPages: pages to read per site. 1 for "this page" / a single article; 8-15 for "what does this site/company do"; up to 30 for "the whole site/all docs".
narration: ONE short first-person sentence telling the user what you are about to do, in the user's language. It MUST describe exactly the action you chose and nothing more: for "crawl" say you will read the site, and do not mention searching; for "search" say what you will look up; for "answer" say you can answer directly. Write it yourself; never copy these instructions.

If the message contains a URL, action MUST be "crawl" or "crawl_then_search": a link the user wrote is opened, never just searched for.
When unsure between "answer" and a web action, choose "answer".
Return ONLY the JSON object. No preamble. No code fence.`;

/** Asked after a crawl, with a summary of what was read. */
export const RESEARCH_REPLAN_SYSTEM_PROMPT = `You already read some web pages to help answer a user's message. Decide whether a web SEARCH is still needed. You do NOT answer the message.

Reply with ONE JSON object and nothing else:
{"needsSearch": boolean, "query": string | null, "narration": string}

needsSearch = true only when the pages read do not cover what the user asked (for example comparisons, reviews, news, competitors, anything beyond that site).
query: a short web search query (under 12 words) when needsSearch is true, else null.
narration: ONE short first-person sentence for the user, in their language, that matches your decision: if needsSearch is false, say the pages were enough; if true, say what you will search for.
Return ONLY the JSON object.`;

/**
 * Output ceiling for planner calls. The yes/no gate fit in 64 tokens; a plan
 * carries a query, URLs and a sentence of narration, and a truncated JSON
 * object is unparseable, which would silently fall back to "answer".
 */
export const RESEARCH_PLANNER_MIN_OUTPUT_TOKENS = 320;

/** Used when the planner omits maxPages or returns nonsense. */
export const RESEARCH_PLANNER_DEFAULT_MAX_PAGES = 12;

/** Upper bound chat-service will request; research-service enforces its own ceiling too. */
export const RESEARCH_PLANNER_MAX_PAGES = 30;

/** A crawl summary handed back to the planner is capped, or the re-plan prompt grows without bound. */
export const RESEARCH_REPLAN_SUMMARY_MAX_CHARS = 3_000;
