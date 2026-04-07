import { z } from "zod";

const appConfigSchema = z.object({
  CHAT_DATABASE_URL: z.string().min(1, "CHAT_DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  OLLAMA_SERVICE_URL: z.string().min(1).default("http://ollama-service:4008"),
  CONNECTOR_SERVICE_URL: z.string().min(1).default("http://connector-service:4003"),
  MEMORY_SERVICE_URL: z.string().min(1).default("http://memory-service:4005"),

  CHAT_PORT: z.coerce.number().int().positive().default(4002),
});

export type AppConfigType = z.infer<typeof appConfigSchema>;

let cachedConfig: AppConfigType | undefined;

export class AppConfig {
  static validate(): AppConfigType {
    const result = appConfigSchema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
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
