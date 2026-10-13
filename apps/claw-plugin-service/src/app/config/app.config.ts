import { isStrongAes256HexKey } from '@claw/shared-utilities';
import { z } from 'zod';

const PLUGIN_ENCRYPTION_KEY_MESSAGE =
  'PLUGIN_ENCRYPTION_KEY must be 64 hex characters of random data (not all zeros); generate one with: openssl rand -hex 32';

const appConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PLUGIN_SERVICE_PORT: z.coerce.number().int().positive().default(4021),
  PLUGIN_DATABASE_URL: z.string().min(1),
  AUTH_SERVICE_URL: z.string().url(),
  INTER_SERVICE_AUTH_TOKEN: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  PLUGIN_ENCRYPTION_KEY: z
    .string({ error: PLUGIN_ENCRYPTION_KEY_MESSAGE })
    .refine(isStrongAes256HexKey, { error: PLUGIN_ENCRYPTION_KEY_MESSAGE }),
  RABBITMQ_URL: z.string().min(1).default('amqp://localhost:5672'),
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
