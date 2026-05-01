import { z } from 'zod';

import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const upsertAutomationPreferenceSchema = z.object({
  isEnabled: z.boolean().optional(),
  autoApproveBelowRiskScore: z.number().int().min(0).max(100).nullable().optional(),
  perDayBudget: z.number().int().min(0).max(10_000).nullable().optional(),
  providers: z.array(z.nativeEnum(WorkspaceProvider)).max(20).optional(),
});

export const actionKindParamSchema = z.object({
  actionKind: z.nativeEnum(AiActionKind),
});

export type UpsertAutomationPreferenceDto = z.infer<typeof upsertAutomationPreferenceSchema>;
