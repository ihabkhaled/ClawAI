import { z } from 'zod';
import { FileEventType } from '../../../common/enums/file-event-type.enum';

const fileEventItemSchema = z.object({
  eventType: z.nativeEnum(FileEventType),
  filePath: z.string().min(1).max(2048),
  repoId: z.string().cuid().optional(),
});

export const createFileEventsSchema = z.object({
  sessionId: z.string().cuid(),
  events: z.array(fileEventItemSchema).min(1).max(100),
});

export type CreateFileEventsDto = z.infer<typeof createFileEventsSchema>;
