// Bounds mirror the payload contract clients validate against, so the server
// can never emit an event its own protocol rejects.
//
// `model.delta` carries the answer text and is capped at 64 KiB; clients also
// cap CUMULATIVE text per turn at the same figure, so a longer answer must be
// split across deltas rather than sent as one oversized event.
export const RUNTIME_V2_MODEL_DELTA_CHARACTERS = 65_536;

// `model.summary` is a short closing line, not the answer, and its schema
// requires a non-empty trimmed string.
export const RUNTIME_V2_MODEL_SUMMARY_CHARACTERS = 4_096;

export const RUNTIME_V2_MODEL_TURN_STARTED_EVENT = 'model.turn.started';
export const RUNTIME_V2_MODEL_DELTA_EVENT = 'model.delta';
export const RUNTIME_V2_MODEL_SUMMARY_EVENT = 'model.summary';

// Used when a turn produced no text at all, because the summary schema refuses
// an empty string and an omitted summary would leave the turn open forever.
export const RUNTIME_V2_EMPTY_SUMMARY = 'The model returned no text for this turn.';
