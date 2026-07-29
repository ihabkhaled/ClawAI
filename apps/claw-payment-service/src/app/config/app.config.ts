import { z } from 'zod';

import { withoutBlankEnvValues } from '../../common/utilities/env-blank.utility';

// A gateway is enabled only when its WHOLE credential set is present. Partial
// configuration must never half-enable a gateway: a checkout that reaches a
// provider without a webhook secret can be paid but never verified, which is
// worse than the gateway simply being off.
const paypalConfigSchema = z.object({
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
});

const paymobConfigSchema = z.object({
  PAYMOB_SECRET_KEY: z.string().min(1).optional(),
  PAYMOB_PUBLIC_KEY: z.string().min(1).optional(),
  PAYMOB_API_KEY: z.string().min(1).optional(),
  PAYMOB_HMAC_SECRET: z.string().min(1).optional(),
  PAYMOB_CARD_INTEGRATION_ID: z.string().min(1).optional(),
  // Paymob must reach this endpoint from the public internet. It is separate
  // from FRONTEND_URL so local checkout returns can stay on claw.local while
  // signed server callbacks use a narrowly exposed HTTPS ingress.
  PAYMOB_WEBHOOK_URL: z
    .string()
    .url()
    .regex(/^https:\/\//)
    .optional(),
  PAYMOB_CURRENCY: z.string().length(3).default('EGP'),
});

const emailConfigSchema = z.object({
  CONTACT_EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  CONTACT_EMAIL_PROVIDER: z.enum(['none', 'smtp']).default('none'),
  CONTACT_EMAIL_FROM: z.string().email().default('no-reply@claw.local'),
  CONTACT_SMTP_HOST: z.string().min(1).optional(),
  CONTACT_SMTP_PORT: z.coerce.number().int().positive().default(587),
  CONTACT_SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  CONTACT_SMTP_USER: z.string().min(1).optional(),
  CONTACT_SMTP_PASS: z.string().min(1).optional(),
});

function requireSmtpValue(
  context: z.RefinementCtx,
  key: 'CONTACT_SMTP_HOST' | 'CONTACT_SMTP_USER' | 'CONTACT_SMTP_PASS',
  value: string | undefined,
): void {
  if (value === undefined) {
    context.addIssue({
      code: 'custom',
      path: [key],
      message: `${key} is required when SMTP email delivery is enabled`,
    });
  }
}

const appConfigSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PAYMENT_DATABASE_URL: z.string().min(1, 'PAYMENT_DATABASE_URL is required'),
    PAYMENT_SERVICE_PORT: z.coerce.number().int().positive().default(4018),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
    ROUTING_SERVICE_URL: z.string().min(1).default('http://routing-service:4004'),

    // Shared secret for the signed internal plan-catalog API. Without it this
    // service cannot learn a price, and a checkout must not proceed.
    INTER_SERVICE_AUTH_TOKEN: z
      .string()
      .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 characters'),

    // Where a gateway sends the customer back. Return URLs are built from THIS
    // value, never from a client-supplied redirect parameter — an attacker-
    // controlled return URL turns a real payment into a phishing landing page.
    FRONTEND_URL: z.string().min(1).default('https://claw.local'),

    // Application-layer envelope key for vaulted gateway tokens. Distinct from
    // the platform-wide ENCRYPTION_KEY so a payment-token compromise does not
    // also expose connector API keys, and so it can be rotated independently.
    PAYMENT_TOKEN_ENCRYPTION_KEY: z
      .string()
      .length(64, 'PAYMENT_TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
      .regex(/^[\da-fA-F]+$/, 'PAYMENT_TOKEN_ENCRYPTION_KEY must be valid hex'),
    // Bumped when the key is rotated; every ciphertext records the version that
    // produced it so old rows stay decryptable during a rotation window.
    PAYMENT_TOKEN_KEY_VERSION: z.coerce.number().int().nonnegative().default(1),

    // FX (Paymob settles in EGP; plan prices stay canonical in USD)
    EXCHANGE_RATE_API_BASE_URL: z.string().min(1).default('https://open.er-api.com/v6'),
    EXCHANGE_RATE_CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),
    USD_TO_EGP_FALLBACK_RATE: z.string().default('0'),
    FX_QUOTE_TTL_MS: z.coerce.number().int().positive().default(900_000),
    FX_SAFETY_MARGIN_BPS: z.coerce.number().int().nonnegative().default(150),

    // Lifecycle
    WEBHOOK_REPLAY_TOLERANCE_MS: z.coerce.number().int().positive().default(600_000),
    BILLING_GRACE_PERIOD_MS: z.coerce.number().int().nonnegative().default(259_200_000),
    BILLING_RECONCILIATION_CRON: z.string().min(1).default('0 */15 * * * *'),
    PAYMENT_OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
    PAYMENT_OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),

    // Outbound gateway HTTP bounds. Unbounded provider calls turn a gateway
    // outage into a thread-pool exhaustion incident.
    PAYMENT_GATEWAY_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    PAYMENT_GATEWAY_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  })
  .and(paypalConfigSchema)
  .and(paymobConfigSchema)
  .and(emailConfigSchema)
  .superRefine((config, ctx) => {
    // Production must fail fast on an insecure default rather than boot into a
    // state where a real card payment can be taken against sandbox credentials.
    if (config.NODE_ENV === 'production' && config.PAYPAL_ENV !== 'live') {
      const paypalPartlyConfigured =
        config.PAYPAL_CLIENT_ID !== undefined || config.PAYPAL_CLIENT_SECRET !== undefined;
      if (paypalPartlyConfigured) {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYPAL_ENV'],
          message: 'PAYPAL_ENV must be "live" when NODE_ENV=production and PayPal is configured',
        });
      }
    }
    if (config.CONTACT_EMAIL_ENABLED === 'true' && config.CONTACT_EMAIL_PROVIDER === 'smtp') {
      requireSmtpValue(ctx, 'CONTACT_SMTP_HOST', config.CONTACT_SMTP_HOST);
      requireSmtpValue(ctx, 'CONTACT_SMTP_USER', config.CONTACT_SMTP_USER);
      requireSmtpValue(ctx, 'CONTACT_SMTP_PASS', config.CONTACT_SMTP_PASS);
    }
  });

export type AppConfigType = z.infer<typeof appConfigSchema>;

let cachedConfig: AppConfigType | undefined;

export class AppConfig {
  static validate(): AppConfigType {
    // Blank values are stripped first so `KEY=` in a .env file means "unset"
    // rather than "the empty string" — otherwise every unconfigured gateway
    // credential fails min(1) and the service cannot boot with gateways off.
    const result = appConfigSchema.safeParse(withoutBlankEnvValues(process.env));
    if (!result.success) {
      // Only the variable NAME and the rule it broke are printed. Never the
      // value: a config error must not leak a secret into a boot log.
      const formatted = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    cachedConfig = result.data;
    return cachedConfig;
  }

  static get(): AppConfigType {
    return cachedConfig ?? AppConfig.validate();
  }
}
