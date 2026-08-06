// Bounds mirror the payload contract clients validate against, so the server
// can never emit an event its own protocol rejects.
//
// `model.delta` carries the answer text and is capped at 64 KiB per event.
export const RUNTIME_V2_MODEL_DELTA_CHARACTERS = 65_536;

// A client caps a turn's CUMULATIVE text at the same 64 KiB, measured in UTF-8
// BYTES. Splitting a longer answer across several deltas therefore does not
// make it deliverable: delta one is accepted, delta two pushes the running
// total past the cap and is rejected, and the run dies mid-answer. A 113 KB
// reply reproduced exactly that. The whole turn has to fit, so an answer above
// this bound is truncated with a visible notice rather than streamed into a
// guaranteed rejection.
//
// Bytes, not characters: the client measures `TextEncoder().encode().byteLength`
// while `String.length` counts UTF-16 units, so a chunk of 65_536 non-ASCII
// characters is well over the byte cap even as a single delta.
export const RUNTIME_V2_MODEL_TURN_BYTES = 65_536;

export const RUNTIME_V2_TRUNCATION_NOTICE = '\n\n…[answer truncated at the runtime protocol limit]';

// `model.summary` is a short closing line, not the answer, and its schema
// requires a non-empty trimmed string.
export const RUNTIME_V2_MODEL_SUMMARY_CHARACTERS = 4_096;

export const RUNTIME_V2_MODEL_TURN_STARTED_EVENT = 'model.turn.started';
export const RUNTIME_V2_MODEL_DELTA_EVENT = 'model.delta';
export const RUNTIME_V2_MODEL_SUMMARY_EVENT = 'model.summary';

// Used when a turn produced no text at all, because the summary schema refuses
// an empty string and an omitted summary would leave the turn open forever.
export const RUNTIME_V2_EMPTY_SUMMARY = 'The model returned no text for this turn.';
