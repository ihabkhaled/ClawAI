import { z } from 'zod';

const appConfigSchema = z.object({
  WORKSPACE_DATABASE_URL: z.string().min(1, 'WORKSPACE_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string')
    .regex(/^[\da-fA-F]+$/, 'ENCRYPTION_KEY must be valid hex'),
  WORKSPACE_PORT: z.coerce.number().int().positive().default(4014),
  // Stream 01 Phase 5 — scheduler
  WORKSPACE_SCHEDULER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  WORKSPACE_SCHEDULER_TICK_CRON: z.string().default('*/30 * * * * *'),
  WORKSPACE_SYNC_STALE_DETECTOR_CRON: z.string().default('*/60 * * * * *'),
  WORKSPACE_SYNC_STALE_MULTIPLIER: z.coerce.number().int().positive().default(3),
  WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS: z.coerce.number().int().positive().default(600),
  WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL: z.coerce.number().int().positive().default(20),
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER: z.coerce.number().int().positive().default(5),
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR: z.coerce.number().int().positive().default(1),
  WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WORKSPACE_SYNC_RETRY_BASE_MS: z.coerce.number().int().positive().default(1000),
  WORKSPACE_SYNC_RETRY_JITTER_MS: z.coerce.number().int().nonnegative().default(500),
  WORKSPACE_SYNC_DLQ_ROUTING_PREFIX: z.string().default('workspace.sync.dlq'),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  SLACK_CLIENT_ID: z.string().default(''),
  SLACK_CLIENT_SECRET: z.string().default(''),
  JIRA_CLIENT_ID: z.string().default(''),
  JIRA_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  CHAT_SERVICE_URL: z.string().min(1).default('http://chat-service:4002'),
  CONNECTOR_SERVICE_URL: z.string().min(1).default('http://connector-service:4003'),
  AI_ACTION_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  AI_ACTION_MODEL_RESOLVER_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  // Stream 10 — AI action approval engine
  AI_ACTION_QUEUE_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  AI_ACTION_RISK_AUTO_APPROVE_MAX: z.coerce.number().int().min(0).max(100).default(30),
  AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON: z.string().default('0 */15 * * * *'),
  AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT: z.coerce.number().int().positive().max(1000).default(100),
  // v3 round 2 — per-user burst rate limit on enqueueSuggestion (Prompt 12).
  // Per-min catches stuck-loop bots; per-hour catches sustained mis-use that
  // slips past per-min. Both are best-effort in-memory sliding windows.
  AI_ACTION_PER_USER_RATE_PER_MIN: z.coerce.number().int().positive().max(10_000).default(20),
  AI_ACTION_PER_USER_RATE_PER_HOUR: z.coerce.number().int().positive().max(100_000).default(300),
  // Stream 11 — webhook receiver
  WEBHOOK_BODY_MAX_BYTES: z.coerce.number().int().positive().default(1_048_576),
  WEBHOOK_REPLAY_WINDOW_MINUTES: z.coerce.number().int().positive().default(30),
  GITHUB_WEBHOOK_SECRET: z.string().default(''),
  GITLAB_WEBHOOK_SECRET: z.string().default(''),
  BITBUCKET_WEBHOOK_SECRET: z.string().default(''),
  JIRA_WEBHOOK_SECRET: z.string().default(''),
  SLACK_SIGNING_SECRET: z.string().default(''),
  FIGMA_WEBHOOK_SECRET: z.string().default(''),
  // Stream 12 — auto-suggest scheduler
  AUTO_SUGGEST_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  AUTO_SUGGEST_JIRA_CRON: z.string().default('0 */4 * * *'),
  AUTO_SUGGEST_GITHUB_STALE_PR_CRON: z.string().default('0 9 * * *'),
  AUTO_SUGGEST_MEETING_NOTES_CRON: z.string().default('0 */2 * * *'),
  AUTO_SUGGEST_PER_USER_DAILY_BUDGET: z.coerce.number().int().positive().default(50),
  AUTO_SUGGEST_DEDUP_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Stream 40 — memory learning loop
  MEMORY_SERVICE_URL: z.string().min(1).default('http://memory-service:4005'),
  // Stream 22 — Gmail HTML rendering + attachments
  FILE_SERVICE_URL: z.string().min(1).default('http://file-service:4006'),
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),
  WORKSPACE_GMAIL_FETCH_ATTACHMENTS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(26_214_400),
  // Stream 41 — ticket planning + coding bridge
  AGENT_SERVICE_URL: z.string().min(1).default('http://agent-service:4015'),
  IMPL_PROMPT_HANDOFF_DEFAULT_MODE: z.enum(['CHAT', 'AGENT', 'CLIPBOARD']).default('CHAT'),
  IMPL_PROMPT_PLAN_MAX_SUBTASKS: z.coerce.number().int().positive().max(50).default(12),
  // Stream 13.3 — per-event-type budget cap on the suggestion factory
  WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR: z.coerce.number().int().positive().default(100),
  // Stream 11.4 — per-connector webhook rate limit
  WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(60),
  // Stream 12.2 — Gmail INBOX_REPLY auto-suggest
  AUTO_SUGGEST_INBOX_REPLY_CRON: z.string().default('0 */15 * * * *'),
  AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS: z.coerce.number().int().positive().default(48),
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
