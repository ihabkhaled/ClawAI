import { z } from 'zod';

const appConfigSchema = z.object({
  LLAMACPP_DATABASE_URL: z.string().min(1, 'LLAMACPP_DATABASE_URL is required'),
  LLAMACPP_SERVICE_URL: z.string().min(1, 'LLAMACPP_SERVICE_URL is required'),
  LLAMACPP_PORT: z.string().default('4017'),
  LLAMACPP_DATA_PATH: z.string().min(1, 'LLAMACPP_DATA_PATH is required'),
  LLAMACPP_BINARY_VERSION: z.string().default('b4123'),
  LLAMACPP_GPU_BACKEND: z.string().default('auto'),
  LLAMACPP_DEFAULT_CTX_SIZE: z.coerce.number().min(512).max(1_048_576).default(8192),
  LLAMACPP_AUTO_INSTALL_BINARY: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  LLAMACPP_LOAD_TIMEOUT_MS: z.coerce.number().default(600_000),
  LLAMACPP_BIND_HOST: z.string().default('127.0.0.1'),
  LLAMACPP_PROCESS_PORT_MIN: z.coerce.number().default(48_500),
  LLAMACPP_PROCESS_PORT_MAX: z.coerce.number().default(48_999),
  HUGGINGFACE_TOKEN: z.string().optional(),
  HUGGINGFACE_API_BASE: z.string().default('https://huggingface.co'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
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

  static reset(): void {
    cachedConfig = undefined;
  }
}
