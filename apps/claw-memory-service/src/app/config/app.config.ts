import { z } from 'zod';

const appConfigSchema = z.object({
  MEMORY_DATABASE_URL: z.string().min(1, 'MEMORY_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  OLLAMA_BASE_URL: z.string().min(1).default('http://ollama:11434'),
  MEMORY_EXTRACTION_MODEL: z.string().min(1).default('AUTO'),
  MEMORY_PORT: z.string().default('4005'),
  // Stream 30 — embeddings + semantic search
  EMBEDDING_MODEL: z.string().min(1).default('nomic-embed-text'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  SEARCH_TOP_K: z.coerce.number().int().positive().max(500).default(50),
  // Memory V2 — sensitivity classifier (ambiguous-case fallback)
  MEMORY_SENSITIVITY_MODEL: z.string().min(1).default('gemma3:4b'),
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
