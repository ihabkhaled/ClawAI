import { z } from "zod";

const appConfigSchema = z.object({
  CONNECTOR_DATABASE_URL: z.string().min(1, "CONNECTOR_DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be a 64-character hex string")
    .regex(/^[0-9a-fA-F]+$/, "ENCRYPTION_KEY must be valid hex"),

  CONNECTOR_PORT: z.coerce.number().int().positive().default(4003),
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
