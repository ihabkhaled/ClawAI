// The journal event that carries what one paid model call cost the user (F108).
//
// A new type rather than a field on an existing one: every model and lifecycle
// payload is validated `.strict()` by the clients, so an extra key on
// `model.summary` or `run.completed` is a rejected event. A type no client has a
// schema for is projected as an unknown event, and the coding agent's telemetry
// already reads `payload.costMicros` off every event it sees.
export const RUNTIME_V2_USAGE_EVENT = 'run.usage';
