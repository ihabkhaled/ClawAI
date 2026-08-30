import { z } from 'zod';

const appConfigSchema = z.object({
  RESEARCH_DATABASE_URL: z.string().min(1, 'RESEARCH_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  // Shared secret for guarded `/api/v1/internal/*` endpoints on sibling
  // services. Required by EntitlementsModule.forRoot because the PAYG credit
  // routes are guarded, unlike the older @Public() internal/quota ones: a
  // missing token comes back 401, the meter cannot tell that from an outage,
  // and every paid model is refused while the wallet sits full.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string')
    .regex(/^[\da-fA-F]+$/, 'ENCRYPTION_KEY must be valid hex'),
  RESEARCH_PORT: z.coerce.number().int().positive().default(4016),
  // Comma-separated domain policy lists applied globally to fetch/search.
  // Each entry is either an exact host ("github.com") or a wildcard suffix
  // ("*.github.com"). Leave empty for permissive (default).
  RESEARCH_DOMAIN_ALLOWLIST: z
    .string()
    .optional()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  RESEARCH_DOMAIN_BLOCKLIST: z
    .string()
    .optional()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
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
    return cachedConfig ?? AppConfig.validate();
  }
}
