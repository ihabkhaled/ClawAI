import { z } from 'zod';

const appConfigSchema = z.object({
  CHAT_DATABASE_URL: z.string().min(1, 'CHAT_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  LLAMACPP_SERVICE_URL: z.string().min(1).default('http://llamacpp-service:4017'),
  CONNECTOR_SERVICE_URL: z.string().min(1).default('http://connector-service:4003'),
  MEMORY_SERVICE_URL: z.string().min(1).default('http://memory-service:4005'),
  FILE_SERVICE_URL: z.string().min(1).default('http://file-service:4006'),
  IMAGE_SERVICE_URL: z.string().min(1).default('http://image-service:4012'),
  FILE_GENERATION_SERVICE_URL: z.string().min(1).default('http://file-generation-service:4013'),
  WORKSPACE_SERVICE_URL: z.string().min(1).default('http://workspace-service:4014'),
  RESEARCH_SERVICE_URL: z.string().min(1).default('http://research-service:4016'),

  OLLAMA_GENERATE_TIMEOUT_MS: z.coerce.number().default(300_000),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default('20m'),
  CHAT_PORT: z.coerce.number().int().positive().default(4002),

  // ─── Semantic Router Flagship feature flags consumed by chat-service ─────
  // See docs/03-architecture/semantic-router-flagship-plan.md. Defaults
  // preserve current behavior — flip to advance a phase.
  ROUTING_THREAD_CONTEXT_INJECTION_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_FOLLOW_UP_DETECTION_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_FALLBACK_ATTEMPTS_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_MAX_FALLBACK_ATTEMPTS: z.coerce.number().int().positive().max(10).default(3),
  ROUTING_JUDGE_HIGH_RISK_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
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
