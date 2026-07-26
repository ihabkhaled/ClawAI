import { z } from 'zod';

import { INTERNAL_PAYMENTS_MAX_ID_LENGTH } from '../constants/internal-payments.constants';

export const internalPaymentIdParamSchema = z
  .object({
    id: z.string().min(1).max(INTERNAL_PAYMENTS_MAX_ID_LENGTH),
  })
  .strict();

export const internalPaymentUserParamSchema = z
  .object({
    userId: z.string().min(1).max(INTERNAL_PAYMENTS_MAX_ID_LENGTH),
  })
  .strict();

export type InternalPaymentIdParamDto = z.infer<typeof internalPaymentIdParamSchema>;
export type InternalPaymentUserParamDto = z.infer<typeof internalPaymentUserParamSchema>;
