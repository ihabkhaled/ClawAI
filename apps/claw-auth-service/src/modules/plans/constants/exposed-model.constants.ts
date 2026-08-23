// Plan model access is validated against connector-service before it is
// persisted. The bound matches the connector endpoint's own array limit so a
// caller cannot discover the ceiling by being rejected at a different number.
export const EXPOSED_MODEL_VALIDATION_PATH = '/api/v1/internal/connectors/models/validate-exposed';
export const EXPOSED_MODEL_VALIDATION_TIMEOUT_MS = 5_000;
export const EXPOSED_MODEL_VALIDATION_MAX_PAIRS = 200;
