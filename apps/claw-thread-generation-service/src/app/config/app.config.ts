import { z } from 'zod';

const appConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  THREAD_GENERATION_DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1).default('amqp://localhost:5672'),
  RESEARCH_SERVICE_URL: z.string().url().default('http://research-service:4016'),
  ROUTING_SERVICE_URL: z.string().url().default('http://routing-service:4004'),
  AUTH_SERVICE_URL: z.string().url().default('http://auth-service:4001'),
  THREAD_GENERATION_SERVICE_PORT: z.coerce.number().int().positive().default(4020),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().optional(),
  CLAW_HOSTNAME: z.string().default('claw.local'),
  CHAT_SERVICE_URL: z.string().url().default('https://chat-service:4002'),
  INTER_SERVICE_AUTH_TOKEN: z.string().min(32),
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
    return cachedConfig ?? AppConfig.validate();
  }
}
