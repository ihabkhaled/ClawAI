import { z } from 'zod';

const appConfigSchema = z.object({
  AGENT_DATABASE_URL: z.string().min(1, 'AGENT_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string')
    .regex(/^[\da-fA-F]+$/, 'ENCRYPTION_KEY must be valid hex'),
  AGENT_PORT: z.coerce.number().int().positive().default(4015),
  NODE_ENV: z.string().default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  AGENT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AGENT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AGENT_PAIRING_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  AGENT_DEVICE_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AGENT_REFRESH_GRACE_SECONDS: z.coerce.number().int().nonnegative().default(15),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export type AgentAppConfig = z.infer<typeof appConfigSchema>;

let cachedConfig: AgentAppConfig | undefined;

export class AppConfig {
  static validate(): AgentAppConfig {
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

  static get(): AgentAppConfig {
    return cachedConfig ?? AppConfig.validate();
  }
}
