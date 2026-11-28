import { z } from 'zod';

import { executeResearchSchema } from './execute-research.dto';

/**
 * The same run a user can request, plus WHO it is for.
 *
 * On the user route the id comes from the verified JWT. Here the caller is a
 * trusted sibling service that has already authenticated the user and applied
 * the plan gate, so it states the id explicitly — which is why this schema is
 * only ever accepted behind ServiceTokenGuard.
 *
 * The research-engine fields (`threadId`, `queries`, `languages`, `depth`,
 * `round`, `excludeUrls`; B1+B2; `platforms`, B3) come with the base schema: chat-service sends
 * them here, threads-service sends none and keeps today's behaviour.
 */
export const internalExecuteResearchSchema = executeResearchSchema.extend({
  userId: z.string().min(1).max(64),
});

export type InternalExecuteResearchDto = z.infer<typeof internalExecuteResearchSchema>;
