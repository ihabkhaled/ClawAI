import { z } from 'zod';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';

export const advancedModelSelectionFields = {
  modelSelectionMode: z.nativeEnum(ModelSelectionMode).optional(),
  requestedProvider: z.string().max(50).optional(),
  requestedModel: z.string().max(255).optional(),
  requestedDisplayName: z.string().max(255).optional(),
  selectedModelSource: z.enum(['LOCAL', 'CONNECTOR']).optional(),
} as const;
