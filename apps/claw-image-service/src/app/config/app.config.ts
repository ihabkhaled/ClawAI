import { z } from 'zod';

const appConfigSchema = z.object({
  IMAGE_DATABASE_URL: z.string().min(1, 'IMAGE_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  IMAGE_PORT: z.string().default('4012'),
  FILE_SERVICE_URL: z.string().min(1, 'FILE_SERVICE_URL is required'),
  CONNECTOR_SERVICE_URL: z.string().min(1, 'CONNECTOR_SERVICE_URL is required'),
  STABLE_DIFFUSION_URL: z.string().default('http://stable-diffusion:7860'),
  COMFYUI_BASE_URL: z.string().default('http://comfyui:8188'),
  CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS: z.coerce.number().int().min(300).default(1000),
  CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
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
