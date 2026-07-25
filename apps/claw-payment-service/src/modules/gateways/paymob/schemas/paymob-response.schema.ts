import { z } from 'zod';

// Every Paymob response is validated before it becomes trusted state.
// Not .strict() — Paymob adds fields over time and a new optional field must not
// break payments — but every field this service reads is required.

export const paymobIntentionResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  client_secret: z.string().min(1),
  intention_order_id: z.union([z.string(), z.number()]).optional(),
});

export type PaymobIntentionResponse = z.infer<typeof paymobIntentionResponseSchema>;

// Paymob reports money in integer piastres (amount_cents) — already minor
// units, so no decimal parsing is needed and none is done.
export const paymobTransactionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  success: z.boolean(),
  pending: z.boolean().optional(),
  is_refunded: z.boolean().optional(),
  is_voided: z.boolean().optional(),
  error_occured: z.boolean().optional(),
  amount_cents: z.union([z.string(), z.number()]),
  currency: z.string().min(1),
  order: z
    .object({
      id: z.union([z.string(), z.number()]),
      merchant_order_id: z.string().nullable().optional(),
    })
    .optional(),
});

export type PaymobTransaction = z.infer<typeof paymobTransactionSchema>;

export const paymobRefundResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  success: z.boolean(),
});

export type PaymobRefundResponse = z.infer<typeof paymobRefundResponseSchema>;

// Card-token callback. ClawAI stores ONLY the gateway token and masked
// metadata — never a PAN, never a CVV. The schema is shaped so there is nowhere
// to put one.
export const paymobCardTokenSchema = z.object({
  token: z.string().min(1),
  masked_pan: z.string().min(1),
  card_subtype: z.string().optional(),
  order_id: z.union([z.string(), z.number()]).optional(),
});

export type PaymobCardToken = z.infer<typeof paymobCardTokenSchema>;
