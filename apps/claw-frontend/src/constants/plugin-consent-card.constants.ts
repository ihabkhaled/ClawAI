export const PLUGIN_CONSENT_BASE_PATH = '/plugins/consent-requests';
export const PLUGIN_CHAT_GRANTS_PATH = '/plugins/chat-grants';

/**
 * The card is looked for while a reply is in flight, so a reload or a dropped stream still finds
 * it. Both numbers cap the polling: it ends with the turn, and never runs past this ceiling.
 */
export const PLUGIN_CONSENT_POLL_MS = 2_000;
export const PLUGIN_CONSENT_POLL_MAX_MS = 180_000;
export const PLUGIN_CONSENT_TICK_MS = 1_000;
