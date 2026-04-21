import { z } from 'zod';
import { ScheduledCommandStatus } from '../../../common/enums/scheduled-command-status.enum';

export const updateScheduledCommandStatusSchema = z.object({
  status: z.nativeEnum(ScheduledCommandStatus),
});

export type UpdateScheduledCommandStatusDto = z.infer<typeof updateScheduledCommandStatusSchema>;
