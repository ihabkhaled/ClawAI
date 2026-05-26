import { z } from 'zod';
import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import { ACTION_EXPIRY_HOURS } from '../../../common/constants/workspace.constants';

export const createActionDraftSchema = z.object({
  connectorId: z.string().min(1).max(128),
  actionType: z.nativeEnum(WorkspaceActionType),
  payload: z.record(z.string(), z.unknown()).refine((v) => Object.keys(v).length > 0, {
    message: 'payload must not be empty',
  }),
  expiresInHours: z.coerce.number().int().min(1).max(72).default(ACTION_EXPIRY_HOURS),
});

export type CreateActionDraftDto = z.infer<typeof createActionDraftSchema>;
