/** How long an unacknowledged inbound message is kept for its owner. */
export const CHANNEL_INBOX_TTL_SECONDS = 7 * 24 * 60 * 60;

/** The inbox keeps only the newest messages; older ones fall off the front. */
export const CHANNEL_INBOX_MAX_MESSAGES = 100;

/** Largest page an inbox read may ask for. */
export const CHANNEL_INBOX_MAX_PAGE = 50;

/** A signed request older or newer than this is a replay, not a delivery. */
export const CHANNEL_SIGNATURE_MAX_SKEW_SECONDS = 300;

/** Raw webhook bodies beyond this are refused before any parsing. */
export const CHANNEL_MAX_BODY_BYTES = 16_384;

export const CHANNEL_SIGNATURE_HEADER = 'x-claw-signature';
export const CHANNEL_TIMESTAMP_HEADER = 'x-claw-timestamp';
export const CHANNEL_SIGNATURE_PREFIX = 'sha256=';

/** Domain-separation label so the derived secret can never equal another HMAC use of the key. */
export const CHANNEL_SECRET_LABEL = 'claw.agent.channel.webhook.v1';

export const CHANNEL_INBOX_KEY_PREFIX = 'agent:channel:inbox:';

/** Public path of the inbound route, relative to the API origin. */
export const CHANNEL_INBOUND_PATH = '/api/v1/agent/channels/inbound';
