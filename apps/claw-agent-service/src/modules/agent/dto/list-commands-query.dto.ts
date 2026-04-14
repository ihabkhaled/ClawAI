import { z } from 'zod';
import { TerminalCommandStatus } from '../../../common/enums/terminal-command-status.enum';

export const listCommandsQuerySchema = z.object({
  sessionId: z.string().cuid().optional(),
  status: z.nativeEnum(TerminalCommandStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListCommandsQueryDto = z.infer<typeof listCommandsQuerySchema>;
