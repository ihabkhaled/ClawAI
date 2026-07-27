import { z } from 'zod';

const appConfigSchema = z.object({
  AUTH_DATABASE_URL: z.string().min(1, 'AUTH_DATABASE_URL is required'),
  AUTH_PORT: z.coerce.number().int().positive().default(4001),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string')
    .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be valid hex'),

  // Shared secret for service-to-service calls. Guards the internal
  // plan-catalog API, which is the source of truth for what a subscription
  // costs — an unauthenticated caller there could influence a real charge.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 characters'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://payment-service:4018'),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_USERNAME: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // System-role permissions reconciliation gate (auth-service boot seeder).
  // 'false' (default) makes the boot-time seeder ADD-only: first init seeds the
  // full SYSTEM_ROLE_SEED, later boots only ADD newly-introduced seed grants and
  // NEVER remove extras an admin granted via the UI (so Compare/Judge survive a
  // restart). 'true' hard-reconciles — ADD missing AND REMOVE extras so the two
  // system roles always match the canonical SYSTEM_ROLE_SEED list.
  SEED_RECONCILE_PERMISSIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type AppConfigType = z.infer<typeof appConfigSchema>;

let cachedConfig: AppConfigType | undefined;

export class AppConfig {
  static validate(): AppConfigType {
    const result = appConfigSchema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    cachedConfig = result.data;
    return cachedConfig;
  }

  static get(): AppConfigType {
    if (!cachedConfig) {
      return AppConfig.validate();
    }
    return cachedConfig;
  }
}
