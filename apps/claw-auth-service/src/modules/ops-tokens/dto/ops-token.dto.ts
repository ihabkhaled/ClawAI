import { z } from 'zod';

import { OpsTokenScope } from '../../../common/enums';
import {
  OPS_TOKEN_DEFAULT_TTL_DAYS,
  OPS_TOKEN_MAX_TTL_DAYS,
} from '../constants/ops-token.constants';

export const createOpsTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.nativeEnum(OpsTokenScope)).min(1).max(Object.values(OpsTokenScope).length),
  ttlDays: z.number().int().min(1).max(OPS_TOKEN_MAX_TTL_DAYS).default(OPS_TOKEN_DEFAULT_TTL_DAYS),
});
export type CreateOpsTokenDto = z.infer<typeof createOpsTokenSchema>;

export const opsTokenIdParamSchema = z.object({ id: z.string().min(1).max(64) });
export type OpsTokenIdParamDto = z.infer<typeof opsTokenIdParamSchema>;

export const verifyOpsTokenSchema = z.object({
  token: z.string().min(1).max(200),
  scope: z.nativeEnum(OpsTokenScope),
});
export type VerifyOpsTokenDto = z.infer<typeof verifyOpsTokenSchema>;
