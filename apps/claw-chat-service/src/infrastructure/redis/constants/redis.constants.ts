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
