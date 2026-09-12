/**
 * Redis pub/sub channel research-service publishes crawl progress ticks on,
 * and chat-service subscribes to for forwarding into its own chat SSE
 * stream. Deliberately Redis pub/sub, not the `claw.events` RabbitMQ
 * exchange: a progress tick is ephemeral — missing one costs nothing, the
 * next tick or the final result supersedes it — the same reasoning rule 17
 * already applies to `runtime.progress.*`, which is also delivered outside
 * the durable event bus.
 *
 * Both services import this constant; neither hardcodes the string.
 */
export const RESEARCH_CRAWL_PROGRESS_CHANNEL = 'research:crawl:progress';
