import { z } from 'zod';

const appConfigSchema = z.object({
  OLLAMA_DATABASE_URL: z.string().min(1, 'OLLAMA_DATABASE_URL is required'),
  OLLAMA_BASE_URL: z.string().min(1, 'OLLAMA_BASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  OLLAMA_GENERATE_TIMEOUT_MS: z.coerce.number().default(300_000),
  OLLAMA_PORT: z.string().default('4008'),
  DISCOVERY_AUTO_REFRESH_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  DISCOVERY_MAX_RESULTS_PER_SOURCE: z.coerce.number().min(1).max(500).default(50),
  DISCOVERY_AUTO_APPROVE_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.85),
  // ComfyUI runtime — used by ComfyUIRuntimeAdapter to health-check the
  // container and refresh its in-memory model registry after a pull.
  COMFYUI_BASE_URL: z.string().default('http://comfyui:8188'),
  // Inside the ollama-service container, this path resolves to the same
  // Docker volume that ComfyUI mounts at /opt/ComfyUI/models. The adapter
  // streams HF downloads into <COMFYUI_MODELS_PATH>/<modelType>/<filename>.
  COMFYUI_MODELS_PATH: z.string().default('/var/lib/claw/comfyui-models'),
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
