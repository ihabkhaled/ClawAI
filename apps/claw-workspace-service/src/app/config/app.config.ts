import { z } from 'zod';

const appConfigSchema = z.object({
  WORKSPACE_DATABASE_URL: z.string().min(1, 'WORKSPACE_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string')
    .regex(/^[\da-fA-F]+$/, 'ENCRYPTION_KEY must be valid hex'),
  WORKSPACE_PORT: z.coerce.number().int().positive().default(4014),
  // Stream 01 Phase 5 — scheduler
  WORKSPACE_SCHEDULER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  WORKSPACE_SCHEDULER_TICK_CRON: z.string().default('*/30 * * * * *'),
  WORKSPACE_SYNC_STALE_DETECTOR_CRON: z.string().default('*/60 * * * * *'),
  WORKSPACE_SYNC_STALE_MULTIPLIER: z.coerce.number().int().positive().default(3),
  WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS: z.coerce.number().int().positive().default(600),
  WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL: z.coerce.number().int().positive().default(20),
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER: z.coerce.number().int().positive().default(5),
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR: z.coerce.number().int().positive().default(1),
  WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WORKSPACE_SYNC_RETRY_BASE_MS: z.coerce.number().int().positive().default(1000),
  WORKSPACE_SYNC_RETRY_JITTER_MS: z.coerce.number().int().nonnegative().default(500),
  WORKSPACE_SYNC_DLQ_ROUTING_PREFIX: z.string().default('workspace.sync.dlq'),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  SLACK_CLIENT_ID: z.string().default(''),
  SLACK_CLIENT_SECRET: z.string().default(''),
  JIRA_CLIENT_ID: z.string().default(''),
  JIRA_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
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
