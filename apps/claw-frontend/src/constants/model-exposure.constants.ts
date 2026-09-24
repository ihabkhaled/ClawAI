// Mirrors `setModelExposureSchema`'s `modelKeys` cap in
// apps/claw-connector-service/src/modules/connectors/dto/set-model-exposure.dto.ts
// (`z.array(...).max(200)`), bounded on purpose so one request cannot rewrite
// an entire catalog unaudited. "Select all shown" can legitimately exceed
// this (a connector can carry hundreds of models), so a bulk apply chunks
// into batches of this size instead of sending one oversized request that
// failed Zod validation with a generic "Validation failed" and no way for
// the operator to tell why (2026-09-24).
export const MODEL_EXPOSURE_BATCH_SIZE = 200;
