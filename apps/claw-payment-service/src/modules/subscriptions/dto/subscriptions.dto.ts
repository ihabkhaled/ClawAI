import { z } from 'zod';

// Bounded, like every other id that reaches a database lookup.
export const paymentMethodParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export type PaymentMethodParamDto = z.infer<typeof paymentMethodParamSchema>;

export const invoiceParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export type InvoiceParamDto = z.infer<typeof invoiceParamSchema>;
