import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';

export const evaluateV2Schema = z.object({
  messageContent: z.string().min(1).max(50_000),
  attachedFileMimeTypes: z.array(z.string().min(1).max(200)).max(50).optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  policyId: z.string().min(1).max(100).optional(),
  forcedProvider: z.string().min(1).max(64).optional(),
  forcedModel: z.string().min(1).max(200).optional(),
  debug: z.boolean().optional(),
});

export type EvaluateV2Dto = z.infer<typeof evaluateV2Schema>;
