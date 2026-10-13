/**
 * Silence limit for one model call on this hop. chat-service times a silent provider out
 * at 300 s and answers with a coded error frame; this hop waits a little longer so that
 * coded error, not an anonymous socket abort, is what arrives first.
 */
export const MODEL_CALL_IDLE_TIMEOUT_MS = 330_000;
/** Absolute limit for one model call. chat-service stops at 600 s; 30 s of margin on this hop. */
export const MODEL_CALL_MAX_TOTAL_MS = 630_000;
/** One NDJSON line (a whole draft) may be large; a line longer than this is a broken stream. */
export const MODEL_STREAM_MAX_LINE_CHARS = 8_000_000;

export const CHAT_GENERATE_STREAM_PATH = '/api/v1/internal/chat/generate-stream';
/** Kept for one release: a chat-service replica that predates the stream route answers 404. */
export const CHAT_GENERATE_PATH = '/api/v1/internal/chat/generate';
export const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
export const HTTP_NOT_FOUND = 404;

export const MODEL_IDLE_TIMEOUT_CODE = 'MODEL_IDLE_TIMEOUT';
export const MODEL_HARD_CEILING_CODE = 'MODEL_HARD_CEILING';
export const MODEL_REASONED_NO_ANSWER_CODE = 'MODEL_REASONED_NO_ANSWER';

/** Messages written by this service; `STEP_MESSAGE_CODES` maps each to a stable machine code. */
export const MODEL_CALL_IDLE_MESSAGE = 'Chat model call went silent';
export const MODEL_CALL_CEILING_MESSAGE = 'Chat model call exceeded its time limit';
export const MODEL_STREAM_TRUNCATED_MESSAGE = 'Chat model stream ended without a result';
export const MODEL_STREAM_MALFORMED_MESSAGE = 'Chat model stream was malformed';

export const GATEWAY_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,59}$/u;
export const FRAME_FALLBACK_STATUS = 502;
