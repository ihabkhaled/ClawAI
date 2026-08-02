import type { RuntimeStartDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2BoundInput, RuntimeV2StartAck } from './runtime-v2-store.types';
import { z } from 'zod';

export const runtimeV2MessageMetadataSchema = z
  .object({
    runtimeV2: z
      .object({
        runId: z.string().min(8).max(160),
        generation: z.string().min(8).max(160),
        clientRequestId: z.string().min(8).max(160),
        publicationState: z.enum(['pending', 'confirmed']),
      })
      .strict(),
  })
  .passthrough();

export type RuntimeV2StartedRun = {
  acknowledgement: RuntimeV2StartAck;
  binding: RuntimeV2BoundInput;
  request: RuntimeStartDto;
};
