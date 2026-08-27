/**
 * Which named crawlers ClawAI's public surface invites, and why.
 *
 * `robots.txt` precedence is not "most permissive wins" — a crawler that finds a
 * group naming its own token reads ONLY that group and ignores `User-agent: *`
 * entirely. Naming an agent is therefore not decoration: it is a second copy of
 * the policy that must carry the same `Disallow` list, or naming a friendly bot
 * would quietly hand it the private routes the wildcard group withholds.
 * `robots.ts` builds every group from the same allow/disallow pair for that
 * reason.
 *
 * The groups below exist because the three things a bot can do with a page are
 * different decisions, even when today's answer is the same for all three:
 * index it for a search results list, fetch it to ground an AI answer, or add it
 * to a training corpus. Splitting them means a future "stop training, keep
 * search" is a one-line edit to one array rather than an archaeology exercise.
 */

/** Classic index-and-rank crawlers behind a search results page. */
export const WEB_SEARCH_CRAWLERS: ReadonlyArray<string> = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  'YandexBot',
];

/**
 * Crawlers that read a page to answer a question in an assistant, with a
 * citation back to it. This is the set that decides whether ClawAI can be
 * quoted by ChatGPT Search, Claude, Perplexity and Copilot at all — none of
 * them has a "submit your site" form, and allowing the fetch is the whole of
 * the opt-in.
 *
 * `*-User` agents are the on-demand half: they fetch a URL because a person
 * asked the assistant about it right now, not on a crawl schedule.
 */
export const AI_ANSWER_ENGINE_CRAWLERS: ReadonlyArray<string> = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  'Amazonbot',
  'MistralAI-User',
];

/**
 * Corpus crawlers, plus the two tokens that are not crawlers at all —
 * `Google-Extended` and `Applebot-Extended` are read only as permission flags
 * for Gemini and Apple Intelligence grounding and training.
 *
 * Deliberately allowed. Everything these agents can reach is the public
 * marketing surface: reviewed, published, already indexable copy that exists to
 * be read. A model that has read it can answer a question about ClawAI without
 * a live fetch, which is the same goal as the answer-engine group by a slower
 * route. No customer data is in scope — the private routes are withheld from
 * this group exactly as they are from every other.
 */
export const AI_TRAINING_CRAWLERS: ReadonlyArray<string> = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'CCBot',
  'cohere-ai',
  'Bytespider',
  'PanguBot',
  'YouBot',
];

/**
 * Every named agent, in the order the groups are declared.
 *
 * Order matters for review, not for parsing: `robots.txt` groups are unordered
 * and matched by token, so this list reads as documentation of intent.
 */
export const NAMED_CRAWLER_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  WEB_SEARCH_CRAWLERS,
  AI_ANSWER_ENGINE_CRAWLERS,
  AI_TRAINING_CRAWLERS,
];
