export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const RUNTIME_V2_REDIS_CLIENT = Symbol('RUNTIME_V2_REDIS_CLIENT');
export const RUNTIME_V2_REDIS_DEADLINE_MS_MAX = 10_000;

/**
 * Connection used only to subscribe to the chat stream channel.
 *
 * Separate from REDIS_CLIENT because Redis puts a subscribed connection into a
 * mode that rejects ordinary commands. Sharing one connection would break every
 * cache read in the service the moment the subscription started.
 */
export const CHAT_STREAM_SUBSCRIBER_CLIENT = 'CHAT_STREAM_SUBSCRIBER_CLIENT';

/**
 * Connection used only to subscribe to the run-cancellation channel.
 *
 * A second subscriber rather than sharing the stream one: a subscribed Redis
 * connection rejects ordinary commands, and keeping one channel per connection
 * means neither feature can silence the other by mistake.
 */
export const STREAM_CANCEL_SUBSCRIBER_CLIENT = 'STREAM_CANCEL_SUBSCRIBER_CLIENT';

/**
 * Connection used only to subscribe to research-service's SITE_CRAWL progress
 * channel (`RESEARCH_CRAWL_PROGRESS_CHANNEL`, published from a different
 * service on the same shared Redis instance — see ADR-092).
 *
 * A third dedicated subscriber, not a shared one: same reasoning as
 * `STREAM_CANCEL_SUBSCRIBER_CLIENT` — a subscribed connection rejects ordinary
 * commands, and one channel per connection means this feature cannot silence
 * the other two, or vice versa.
 */
export const RESEARCH_PROGRESS_SUBSCRIBER_CLIENT = 'RESEARCH_PROGRESS_SUBSCRIBER_CLIENT';
