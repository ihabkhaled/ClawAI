import { z } from 'zod';

const appConfigSchema = z.object({
  ROUTING_DATABASE_URL: z.string().min(1, 'ROUTING_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  OLLAMA_ROUTER_MODEL: z.string().min(1).default('qwen3:1.7b'),
  OLLAMA_ROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default('20m'),
  OLLAMA_ROUTER_WARMUP_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  OLLAMA_ROUTER_WARMUP_INTERVAL_MS: z.coerce.number().int().positive().default(120_000),
  ROUTING_LATENCY_EWMA_WEIGHT: z.coerce.number().min(0).max(1).default(0.7),
  ROUTING_PROVIDER_SLOW_THRESHOLD_MS: z.coerce.number().int().positive().default(15_000),
  ROUTING_PROVIDER_SLOW_STREAK: z.coerce.number().int().positive().default(3),
  ROUTING_PROVIDER_CIRCUIT_OPEN_MS: z.coerce.number().int().positive().default(90_000),
  ROUTING_LOCAL_DEGRADE_LATENCY_MS: z.coerce.number().int().positive().default(18_000),
  ROUTING_LATENCY_PENALTY_STEP_MS: z.coerce.number().int().positive().default(6_000),

  ROUTING_PORT: z.coerce.number().int().positive().default(4004),
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
