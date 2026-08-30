import { z } from 'zod';

const appConfigSchema = z.object({
  // Local inference is NOT free — someone bought the GPU and someone pays for
  // the electricity. Only compute the USER owns is genuinely zero-cost to the
  // platform, which is the self-hosting default.
  LOCAL_COMPUTE_OWNERSHIP: z.enum(['USER_OWNED', 'PLATFORM_HOSTED']).default('USER_OWNED'),
  // Operational cost estimate for platform-hosted local inference, in micro-USD
  // per million tokens. Leaving this at 0 while hosting the compute yourself is
  // treated as a misconfiguration and fails CLOSED rather than pricing every
  // local request as free.
  LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD: z.coerce.number().int().min(0).default(0),

  ROUTING_DATABASE_URL: z.string().min(1, 'ROUTING_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  // Shared secret for guarded `/api/v1/internal/*` endpoints on sibling
  // services. Required by EntitlementsModule.forRoot because the PAYG credit
  // routes are guarded, unlike the older @Public() internal/quota ones: a
  // missing token comes back 401, the meter cannot tell that from an outage,
  // and every paid model is refused while the wallet sits full.
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),
  CONNECTOR_SERVICE_URL: z.string().min(1).default('http://connector-service:4003'),
  OLLAMA_SERVICE_URL: z.string().min(1).default('http://ollama-service:4008'),
  OLLAMA_ROUTER_MODEL: z.string().min(1).default('qwen3:1.7b'),
  OLLAMA_ROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default('20m'),
  OLLAMA_ROUTER_WARMUP_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  OLLAMA_ROUTER_WARMUP_INTERVAL_MS: z.coerce.number().int().positive().default(120_000),
  ROUTER_COMPACT_PROMPT: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() !== 'false'),
  ROUTING_LATENCY_EWMA_WEIGHT: z.coerce.number().min(0).max(1).default(0.7),
  ROUTING_PROVIDER_SLOW_THRESHOLD_MS: z.coerce.number().int().positive().default(15_000),
  ROUTING_PROVIDER_SLOW_STREAK: z.coerce.number().int().positive().default(3),
  ROUTING_PROVIDER_CIRCUIT_OPEN_MS: z.coerce.number().int().positive().default(90_000),
  ROUTING_LOCAL_DEGRADE_LATENCY_MS: z.coerce.number().int().positive().default(18_000),
  ROUTING_LATENCY_PENALTY_STEP_MS: z.coerce.number().int().positive().default(6_000),

  ROUTING_PORT: z.coerce.number().int().positive().default(4004),

  // ─── Semantic Router Flagship feature flags ──────────────────────────────
  // See docs/03-architecture/semantic-router-flagship-plan.md for the
  // phased rollout. Defaults preserve current v1 hot-path behavior; flip
  // each flag to `true` (or raise the canary percent) to advance a phase.
  ROUTING_SEMANTIC_ANALYZER_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_SEMANTIC_ANALYZER_USE_FOR_ROUTING: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_AI_ROUTE_PLANNER_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_AI_ROUTE_PLANNER_USE_FOR_ROUTING: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_V2_CANARY_PERCENT: z.coerce.number().int().min(0).max(100).default(0),
  ROUTING_FALLBACK_ATTEMPTS_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  ROUTING_MAX_FALLBACK_ATTEMPTS: z.coerce.number().int().positive().max(10).default(3),
  ROUTING_JUDGE_HIGH_RISK_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  // Phase 9 — wire LearningLoopManager.getRollingScore into the scoring
  // engine's `learnedSuccess` dimension. When false the dimension stays
  // at the neutral 0.6 default and route decisions ignore feedback.
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
