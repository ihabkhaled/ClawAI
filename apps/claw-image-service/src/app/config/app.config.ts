import { z } from 'zod';

const appConfigSchema = z.object({
  IMAGE_DATABASE_URL: z.string().min(1, 'IMAGE_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  IMAGE_PORT: z.string().default('4012'),
  FILE_SERVICE_URL: z.string().min(1, 'FILE_SERVICE_URL is required'),
  CONNECTOR_SERVICE_URL: z.string().min(1, 'CONNECTOR_SERVICE_URL is required'),
  // PAYG credit — the wallet, the reservation and the price all live in
  // auth-service (ADR-082). This service only needs to know where to reach it.
  // Already present in .env / .env.example, and both compose files mount the
  // same `env_file: ../.env`, so no infra change accompanies this key.
  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  STABLE_DIFFUSION_URL: z.string().default('http://stable-diffusion:7860'),
  // Stream 22 — shared secret for `Authorization: Service <token>` calls into
  // file-service guarded `/api/v1/internal/files/*` endpoints. Matches the
  // value in claw-file-service AppConfig + claw-workspace-service AppConfig.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),
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
