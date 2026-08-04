import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';

export const evaluateRouteSchema = z.object({
  messageContent: z
    .string()
    .min(1, 'Message content is required')
    .max(100000, 'Message content must be at most 100000 characters'),
  threadId: z.string().max(255, 'Thread ID must be at most 255 characters').optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  forcedModel: z.string().max(255, 'Forced model must be at most 255 characters').optional(),
  forcedProvider: z.string().max(50, 'Forced provider must be at most 50 characters').optional(),
  // Set by callers whose request will execute through the Runtime V2 agent
  // lane, which needs a model that can emit native tool calls. Optional so
  // every existing caller keeps working unchanged; absent means false.
  requiresToolCalling: z.boolean().optional(),
});

export type EvaluateRouteDto = z.infer<typeof evaluateRouteSchema>;
