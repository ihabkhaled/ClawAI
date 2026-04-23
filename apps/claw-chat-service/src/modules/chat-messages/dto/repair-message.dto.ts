import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { researchFields } from './research-fields.dto';

import { RepairType } from '../../../common/enums/repair-type.enum';

export const repairMessageSchema = z
  .object({
    messageId: z.string().max(255).optional(),
    content: z.string().min(1).max(50_000).optional(),
    threadId: z.string().max(255).optional(),
    repairTypes: z.array(z.nativeEnum(RepairType)).min(1).max(4),
    targetProvider: z.string().max(50).optional(),
    targetModel: z.string().max(255).optional(),
    ...advancedModelSelectionFields,
    ...researchFields,
  })
  .refine((data) => data.messageId !== undefined || data.content !== undefined, {
    message: 'Either messageId or content must be provided',
    path: ['messageId'],
  });

export type RepairMessageDto = z.infer<typeof repairMessageSchema>;
