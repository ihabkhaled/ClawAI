import { z } from 'zod';
import { BanDurationUnit } from '../../../common/enums';
import { BAN_MAX_DURATION_MS, BAN_REASON_MAX_LENGTH } from '../constants/user-admin.constants';
import { computeBannedUntil } from '../service.utilities/ban-state.utility';

export const banUserSchema = z
  .object({
    unit: z.nativeEnum(BanDurationUnit),
    amount: z.number().int().min(1).max(BAN_MAX_DURATION_MS).optional(),
    reason: z.string().trim().min(1, 'A reason is required').max(BAN_REASON_MAX_LENGTH),
  })
  .superRefine((value, context) => {
    try {
      computeBannedUntil(value.unit, value.amount, new Date());
    } catch (error: unknown) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: error instanceof Error ? error.message : 'Invalid ban duration',
      });
    }
  });

export type BanUserDto = z.infer<typeof banUserSchema>;
