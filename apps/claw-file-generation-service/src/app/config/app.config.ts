import { z } from 'zod';

const appConfigSchema = z.object({
  FILE_GENERATION_DATABASE_URL: z.string().min(1, 'FILE_GENERATION_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FILE_GENERATION_PORT: z.string().default('4013'),
  FILE_SERVICE_URL: z.string().min(1, 'FILE_SERVICE_URL is required'),
  // Stream 22 — shared secret for `Authorization: Service <token>` calls into
  // file-service guarded `/api/v1/internal/files/*` endpoints. Matches the
  // value in claw-file-service AppConfig + claw-workspace-service AppConfig.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),
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
