import { z } from 'zod';
import {
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS_DEFAULT,
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS_HARD_CAP,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_DEFAULT,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_HARD_CAP,
} from '../../modules/chat-messages/constants/agentic-loop.constants';

const runtimeV2RedisDeadlineMsSchema = z.coerce.number().int().min(50).max(10_000).default(2_000);

const appConfigSchema = z.object({
  CHAT_DATABASE_URL: z.string().min(1, 'CHAT_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RUNTIME_V2_REDIS_DEADLINE_MS: runtimeV2RedisDeadlineMsSchema,
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // The canonical origin for public share URLs. Read from configuration, never
  // from a request Host or X-Forwarded-Host header: a preview domain, a
  // reverse-proxy host, or a spoofed forwarded header must not be able to
  // become the canonical URL we hand to a user or to a search engine.
  PUBLIC_SITE_URL: z.string().min(1).default('https://claw.local'),

  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  LLAMACPP_SERVICE_URL: z.string().min(1).default('http://llamacpp-service:4017'),
  CONNECTOR_SERVICE_URL: z.string().min(1).default('http://connector-service:4003'),
  MEMORY_SERVICE_URL: z.string().min(1).default('http://memory-service:4005'),
  FILE_SERVICE_URL: z.string().min(1).default('http://file-service:4006'),
  IMAGE_SERVICE_URL: z.string().min(1).default('http://image-service:4012'),
  // Google Cloud Vision SafeSearch, used to moderate images in a published
  // share before it may carry advertising. Optional: with no key the scan
  // reports UNAVAILABLE and the share stays readable but never ad- or
  // index-eligible, which is the same fail-closed behaviour as before.
  GOOGLE_CLOUD_VISION_API_KEY: z.string().default(''),
  FILE_GENERATION_SERVICE_URL: z.string().min(1).default('http://file-generation-service:4013'),
  WORKSPACE_SERVICE_URL: z.string().min(1).default('http://workspace-service:4014'),
  RESEARCH_SERVICE_URL: z.string().min(1).default('http://research-service:4016'),

  OLLAMA_GENERATE_TIMEOUT_MS: z.coerce.number().default(300_000),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default('20m'),
  CHAT_PORT: z.coerce.number().int().positive().default(4002),

  // ─── Ollama Cloud agentic tool-loop caps ──────────────────────────────
  // Raised 10 → 50 on 2026-05-31 so kimi-k2 / deepseek-v4-pro / glm-5.1
  // have enough turns for multi-step research without prematurely hitting
  // the safety cap. The wrap-up path now also synthesizes a final answer
  // from already-gathered evidence on cap-reached instead of returning a
  // user-visible error string.
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: z.coerce
    .number()
    .int()
    .positive()
    .max(OLLAMA_TOOL_LOOP_MAX_ITERATIONS_HARD_CAP)
    .default(OLLAMA_TOOL_LOOP_MAX_ITERATIONS_DEFAULT),
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_HARD_CAP)
    .default(OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_DEFAULT),

  // ─── Runtime V2 provider-native tool calling ─────────────────────────────
  // When true, an admitted Runtime V2 tool catalog is translated into the
  // selected provider's native tool dialect and attached to the request, and
  // tool calls are parsed back off the response. When false, every provider
  // resolves to the NONE dialect and the run falls back to the prompt-JSON
  // compatibility lane. Defaults ON: the prompt-JSON lane cannot express a
  // real tool call, so leaving it as the only lane is the defect this flag
  // exists to close. Flip to false to disable native tools per deployment.
  CHAT_NATIVE_TOOL_CALLING_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  // Upper bound on the serialized native tool catalog. The catalog is re-sent
  // on EVERY turn of a multi-turn tool loop, so it is the dominant recurring
  // payload; exceeding this budget fails admission loudly instead of silently
  // burning the context window.
  CHAT_TOOL_CATALOG_MAX_BYTES: z.coerce.number().int().positive().default(262_144),

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

  // Stream 22 — shared secret for `Authorization: Service <token>` calls into
  // file-service guarded `/api/v1/internal/files/*` endpoints. Matches the
  // value in claw-file-service AppConfig + claw-workspace-service AppConfig.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),

  // Slice B — operator override letting a deployment accept image attachments
  // in LOCAL_ONLY / PRIVACY_FIRST modes even when no local vision-capable
  // model is installed. Default off: the safer behaviour is to drop images
  // with a user-visible warning rather than silently let them reach a cloud
  // fallback. Flip to true only when an out-of-band local vision pipeline
  // is wired up (e.g. an external OCR sidecar).
  ALLOW_LOCAL_ONLY_ATTACHMENTS_WITHOUT_VISION: z.coerce.boolean().default(false),

  // Slice B — timeout for the LocalModelSelectionService.hasLocalVisionModel()
  // probe. The probe sits in the request hot path; if ollama-service is slow
  // we'd rather fail-closed (assume no vision model) than block the user.
  LOCAL_VISION_MODEL_DETECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),

  // ─── Slice D foundation 3 — Compare/Judge/Critic file attachments ──────
  // See docs/03-architecture/compare-file-attachments.md (Slice D close-out).
  // All flags default OFF; deployments opt-in.

  // Anthropic native PDF input — when true, the anthropic adapter forwards
  // PDF bytes as a `document` content part instead of falling through to
  // extracted text. Requires `anthropic-version` >= 2024-06-01 (bumped
  // centrally in connector-service constants).
  ENABLE_ANTHROPIC_NATIVE_PDF: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),

  // Gemini Files API — when true, large attachments (>= threshold) are
  // uploaded to Gemini's Files API and referenced by URI instead of inlined
  // as base64. Files API entries live for 48h on Google's side; we cache the
  // URI for half that window to be safe.
  ENABLE_GEMINI_FILES_API: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  GEMINI_FILES_API_SIZE_THRESHOLD_BYTES: z.coerce.number().int().positive().default(20_000_000),
  GEMINI_FILES_API_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  GEMINI_FILES_API_CACHE_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  GEMINI_FILES_API_TTL_MINUTES: z.coerce.number().int().positive().default(1440),
  GEMINI_CONCURRENT_UPLOADS_LIMIT: z.coerce.number().int().positive().max(20).default(3),
});

const runtimeV2RedisTestUrlSchema = z
  .string()
  .url()
  .superRefine((value, context) => {
    const parsed = new URL(value);
    const database = Number(parsed.pathname.slice(1));
    if (
      parsed.protocol !== 'redis:' ||
      !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)
    )
      context.addIssue({ code: 'custom', message: 'Runtime V2 test Redis must be loopback-only' });
    if (!Number.isInteger(database) || database <= 0)
      context.addIssue({
        code: 'custom',
        message: 'Runtime V2 test Redis requires a nonzero database',
      });
  });

export type AppConfigType = z.infer<typeof appConfigSchema>;

let cachedConfig: AppConfigType | undefined;

export class AppConfig {
  static runtimeV2RedisDeadlineMs(): number {
    return runtimeV2RedisDeadlineMsSchema.parse(process.env.RUNTIME_V2_REDIS_DEADLINE_MS);
  }

  static runtimeV2RedisTestUrl(): string {
    return runtimeV2RedisTestUrlSchema.parse(process.env.RUNTIME_V2_TEST_REDIS_URL);
  }

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
