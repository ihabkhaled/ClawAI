import { z } from 'zod';

const appConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  THREADS_SERVICE_PORT: z.coerce.number().int().positive().default(4019),
  THREADS_DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().optional(),
  CLAW_HOSTNAME: z.string().default('claw.local'),
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
