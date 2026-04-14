import { z } from 'zod';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';

export const listSessionsQuerySchema = z.object({
  status: z.nativeEnum(AgentSessionStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListSessionsQueryDto = z.infer<typeof listSessionsQuerySchema>;
