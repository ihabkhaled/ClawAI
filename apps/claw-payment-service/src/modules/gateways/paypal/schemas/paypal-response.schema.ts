import { z } from 'zod';

// Every PayPal response is validated before it is allowed to influence business
// state. A gateway is an untrusted external system: a shape change, a partial
// response or an outright compromise must fail loudly here rather than silently
// activating a subscription with an undefined amount.
//
// Schemas are deliberately NOT .strict() — PayPal adds fields over time and a
// new optional field should not break payments in production. Every field this
// service actually reads is required.

export const paypalTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
});

export type PaypalTokenResponse = z.infer<typeof paypalTokenResponseSchema>;

// PayPal renders money as a decimal STRING ("5.00"), never a float. It is
// parsed to integer minor units at the boundary and compared as an integer;
// comparing "5.00" to 5.0 as floats is how amount checks quietly stop working.
const paypalAmountSchema = z.object({
  currency_code: z.string().length(3),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/, 'amount must be a decimal string'),
});

const paypalCaptureSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  amount: paypalAmountSchema,
  custom_id: z.string().optional(),
  invoice_id: z.string().optional(),
});

export const paypalOrderResponseSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  purchase_units: z
    .array(
      z.object({
        reference_id: z.string().optional(),
        custom_id: z.string().optional(),
        invoice_id: z.string().optional(),
        amount: paypalAmountSchema.optional(),
        payments: z
          .object({
            captures: z.array(paypalCaptureSchema).optional(),
          })
          .optional(),
      }),
    )
    .min(1),
  links: z
    .array(
      z.object({
        href: z.string().url(),
        rel: z.string().min(1),
        method: z.string().min(1),
      }),
    )
    .optional(),
});

export type PaypalOrderResponse = z.infer<typeof paypalOrderResponseSchema>;

export const paypalSubscriptionResponseSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  plan_id: z.string().min(1).optional(),
  custom_id: z.string().optional(),
  start_time: z.string().optional(),
  billing_info: z
    .object({
      next_billing_time: z.string().optional(),
      last_payment: z
        .object({
          amount: paypalAmountSchema,
          time: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type PaypalSubscriptionResponse = z.infer<typeof paypalSubscriptionResponseSchema>;

export const paypalWebhookVerificationSchema = z.object({
  verification_status: z.string().min(1),
});

export type PaypalWebhookVerification = z.infer<typeof paypalWebhookVerificationSchema>;

export const paypalRefundResponseSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  amount: paypalAmountSchema.optional(),
});

export type PaypalRefundResponse = z.infer<typeof paypalRefundResponseSchema>;

export const paypalProductResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const paypalBillingPlanResponseSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  product_id: z.string().min(1).optional(),
});

export type PaypalBillingPlanResponse = z.infer<typeof paypalBillingPlanResponseSchema>;
