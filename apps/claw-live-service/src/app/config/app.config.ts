import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const appConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  LIVE_SERVICE_PORT: z.coerce.number().int().positive().default(4022),
  LIVE_DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1).default('amqp://localhost:5672'),
  AUTH_SERVICE_URL: z.string().url(),
  CHAT_SERVICE_URL: z.string().url(),
  CONNECTOR_SERVICE_URL: z.string().url(),
  FILE_SERVICE_URL: z.string().url(),
  FILE_GENERATION_SERVICE_URL: z.string().url(),
  ROUTING_SERVICE_URL: z.string().url().default('https://routing-service:4004'),
  RESEARCH_SERVICE_URL: z.string().url().default('https://research-service:4016'),
  INTER_SERVICE_AUTH_TOKEN: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  LIVE_ALLOW_HTTP_SOURCES: booleanFlag,
  LIVE_WORKER_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  /** Twitch's public web-player client id (server pull, ADR-221 batch 3); empty turns Twitch pull off. */
  LIVE_TWITCH_CLIENT_ID: z.string().trim().default(''),
  CORS_ORIGINS: z.string().optional(),
  CLAW_HOSTNAME: z.string().default('claw.local'),
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
