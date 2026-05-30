import { z } from 'zod';

/**
 * Query parameters accepted by GET /api/v1/llamacpp/runtime-progress/probe.
 *
 * The endpoint exists for admin diagnostics. Today there are no required
 * inputs — the report is fully derived from internal state. We still publish
 * a Zod schema so the controller has a single, type-safe validation seam and
 * future query options (e.g. ?includeModels=true) can be added without
 * touching controller signatures.
 */
export const RuntimeProbeQuerySchema = z.object({}).strict();

export type RuntimeProbeQueryDto = z.infer<typeof RuntimeProbeQuerySchema>;
