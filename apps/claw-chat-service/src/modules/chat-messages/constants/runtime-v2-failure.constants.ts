// Bounded because the reason travels on an event whose payload is size-capped,
// and because an unbounded provider message is a redaction risk.
export const RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS = 400;

export const RUNTIME_V2_UNKNOWN_FAILURE_CODE = 'RUNTIME_RUN_FAILED';

export const RUNTIME_V2_STREAM_ERROR_EVENT_TYPE = 'stream.error';
