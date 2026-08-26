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
  CONNECTOR_SERVICE_URL: z.string().url().default('https://connector-service:4003'),
  PUBLIC_SITE_URL: z.string().url().default('https://claw.local'),
  CONTACT_EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  CONTACT_EMAIL_PROVIDER: z.enum(['none', 'smtp']).default('none'),
  CONTACT_EMAIL_FROM: z.string().email().default('no-reply@claw-ai.co'),
  CONTACT_EMAIL_TO: z.union([z.string().email(), z.literal('')]).default(''),
  CONTACT_SMTP_HOST: z.string().min(1).optional(),
  CONTACT_SMTP_PORT: z.coerce.number().int().positive().default(587),
  CONTACT_SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  CONTACT_SMTP_USER: z.string().min(1).optional(),
  CONTACT_SMTP_PASS: z.string().min(1).optional(),
  DEPLOYMENT_STATUS_FILE: z.string().min(1).default('/app/.deploy/status.json'),
  DEPLOYMENT_AUTOMATION_FILE: z.string().min(1).default('/app/.deploy/automation.json'),

  // Manual production deployment from the admin deployment page. All three are
  // required together: a partial set leaves manual dispatch disabled rather
  // than half-enabled, and the page hides the controls instead of offering a
  // button that can only fail. GITHUB_DEPLOY_TOKEN needs `actions: write` on
  // the repository and nothing else.
  GITHUB_DEPLOY_TOKEN: z.string().min(1).optional(),
  GITHUB_DEPLOY_REPOSITORY: z.string().min(1).optional(),
  GITHUB_DEPLOY_REF: z.string().min(1).optional(),

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
