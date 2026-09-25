import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';

import { RepairType } from '../../../common/enums/repair-type.enum';

export const repairMessageSchema = z
  .object({
    messageId: z.string().max(255).optional(),
    content: z.string().max(50_000).optional(),
    threadId: z.string().max(255).optional(),
    repairTypes: z.array(z.nativeEnum(RepairType)).min(1).max(4),
    targetProvider: z.string().max(50).optional(),
    targetModel: z.string().max(255).optional(),
    ...advancedModelSelectionFields,
    ...researchFields,
    ...attachmentFields,
  })
  // A repair targets a stored message, typed text, or attached files. An
  // attachment-only repair is as legitimate as an attachment-only chat turn.
  .refine(
    (data) =>
      data.messageId !== undefined ||
      (data.content ?? '').trim().length > 0 ||
      (data.fileIds?.length ?? 0) > 0,
    {
      message: 'Either messageId, content or fileIds must be provided',
      path: ['messageId'],
    },
  );

export type RepairMessageDto = z.infer<typeof repairMessageSchema>;
