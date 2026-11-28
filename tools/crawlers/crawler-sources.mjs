// The OFFICIAL, machine-readable IP range files of crawlers that publish them (ADR-232).
//
// An address inside one of these files is PROOF that a request comes from that operator; a
// User-Agent header proves nothing. Every URL was fetched and parsed on 2026-11-28.
//
// A crawler that can only be verified by reverse DNS (Yandex, Baidu, PetalBot, Seznam, Naver,
// Mojeek, Brave, Qwant, ...) or that publishes no list at all (Anthropic ClaudeBot, Meta, Slack,
// Twitter, LinkedIn, Amazonbot: its list is an HTML page, not a file) is NOT here. nginx treats a
// request claiming to be one of those as an ordinary visitor: never banned for the claim.
//
// `operator` is the name nginx logs and keys on. It must match a value of the User-Agent map in
// infra/nginx/nginx.conf; tools/__tests__/nginx-edge-policy.test.mjs fails when they drift.

/**
 * @typedef {object} CrawlerSource
 * @property {string} id        `<operator>/<file>`, the name of its section in ranges.conf.
 * @property {string} operator  who runs the crawler (the geo value).
 * @property {string} url       the operator's own published range file.
 */

/** @type {readonly CrawlerSource[]} */
export const CRAWLER_SOURCES = Object.freeze([
  {
    id: 'google/googlebot',
    operator: 'google',
    url: 'https://developers.google.com/static/search/apis/ipranges/googlebot.json',
  },
  {
    id: 'google/special-crawlers',
    operator: 'google',
    url: 'https://developers.google.com/static/search/apis/ipranges/special-crawlers.json',
  },
  {
    id: 'google/user-triggered-fetchers',
    operator: 'google',
    url: 'https://developers.google.com/static/search/apis/ipranges/user-triggered-fetchers.json',
  },
  {
    id: 'google/user-triggered-fetchers-google',
    operator: 'google',
    url: 'https://developers.google.com/static/search/apis/ipranges/user-triggered-fetchers-google.json',
  },
  { id: 'bing/bingbot', operator: 'bing', url: 'https://www.bing.com/toolbox/bingbot.json' },
  {
    id: 'apple/applebot',
    operator: 'apple',
    url: 'https://search.developer.apple.com/applebot.json',
  },
  {
    id: 'duckduckgo/duckduckbot',
    operator: 'duckduckgo',
    url: 'https://duckduckgo.com/duckduckbot.json',
  },
  { id: 'openai/gptbot', operator: 'openai', url: 'https://openai.com/gptbot.json' },
  { id: 'openai/searchbot', operator: 'openai', url: 'https://openai.com/searchbot.json' },
  { id: 'openai/chatgpt-user', operator: 'openai', url: 'https://openai.com/chatgpt-user.json' },
  {
    id: 'perplexity/perplexitybot',
    operator: 'perplexity',
    url: 'https://www.perplexity.ai/perplexitybot.json',
  },
  {
    id: 'perplexity/perplexity-user',
    operator: 'perplexity',
    url: 'https://www.perplexity.ai/perplexity-user.json',
  },
  {
    id: 'mistral/mistralai-user',
    operator: 'mistral',
    url: 'https://mistral.ai/mistralai-user-ips.json',
  },
  {
    id: 'commoncrawl/ccbot',
    operator: 'commoncrawl',
    url: 'https://index.commoncrawl.org/ccbot.json',
  },
  {
    id: 'ahrefs/ahrefsbot',
    operator: 'ahrefs',
    url: 'https://api.ahrefs.com/v3/public/crawler-ip-ranges',
  },
]);

/** The distinct operator names, in source order. */
export const CRAWLER_OPERATORS = Object.freeze([
  ...new Set(CRAWLER_SOURCES.map((source) => source.operator)),
]);

/** Where the generated geo include lives. */
export const DEFAULT_RANGES_FILE = 'infra/nginx/verified-crawlers/ranges.conf';
