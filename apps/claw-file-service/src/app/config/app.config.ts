import { z } from 'zod';

const appConfigSchema = z.object({
  FILES_DATABASE_URL: z.string().min(1, 'FILES_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FILES_PORT: z.string().default('4006'),
  FILE_STORAGE_PATH: z.string().default('/data/uploads'),
  CLAMAV_HOST: z.string().default('clamav'),
  CLAMAV_PORT: z.coerce.number().default(3310),
  CLAMAV_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  // Stream 22 — service-to-service auth for /upload-internal + /download-internal
  INTER_SERVICE_AUTH_TOKEN: z.string().min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars').default('change-me-inter-service-token-32-chars-min'),
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
