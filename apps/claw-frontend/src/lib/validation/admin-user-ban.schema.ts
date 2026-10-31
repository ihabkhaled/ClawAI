import { z } from 'zod';

import { BAN_AMOUNT_MAX, BAN_REASON_MAX_LENGTH } from '@/constants/admin-user-management.constants';
import { BanDurationUnit } from '@/enums/ban-duration-unit.enum';

/** Mirrors the API's ban body: a timed ban needs a whole amount, a lifetime ban ignores it, a reason is required. */
export const adminUserBanSchema = z
  .object({
    unit: z.nativeEnum(BanDurationUnit),
    amount: z.number().int().min(1).max(BAN_AMOUNT_MAX),
    reason: z.string().trim().min(1).max(BAN_REASON_MAX_LENGTH),
  })
  .superRefine((value, context) => {
    if (value.unit !== BanDurationUnit.LIFETIME && !Number.isInteger(value.amount)) {
      context.addIssue({ code: 'custom', path: ['amount'], message: 'amount' });
    }
  });

export type AdminUserBanFormValues = z.infer<typeof adminUserBanSchema>;
