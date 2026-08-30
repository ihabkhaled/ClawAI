import { z } from 'zod';

const appConfigSchema = z.object({
  LLAMACPP_DATABASE_URL: z.string().min(1, 'LLAMACPP_DATABASE_URL is required'),
  LLAMACPP_SERVICE_URL: z.string().min(1, 'LLAMACPP_SERVICE_URL is required'),
  LLAMACPP_PORT: z.string().default('4017'),
  LLAMACPP_DATA_PATH: z.string().min(1, 'LLAMACPP_DATA_PATH is required'),
  LLAMACPP_BINARY_VERSION: z.string().default('b4123'),
  LLAMACPP_GPU_BACKEND: z.string().default('auto'),
  LLAMACPP_DEFAULT_CTX_SIZE: z.coerce.number().min(512).max(1_048_576).default(32_768),
  LLAMACPP_AUTO_INSTALL_BINARY: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  // When true, BinaryInstallerManager skips the dynamic GitHub-API resolver
  // and uses the static BINARY_RELEASES map only. Use for prod reproducibility
  // when you need a specific pinned version + real SHA-256 verification.
  LLAMACPP_FORCE_PINNED_BINARY: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  LLAMACPP_PREFLIGHT_OVERRIDE_ALLOWED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  LLAMACPP_LOAD_TIMEOUT_MS: z.coerce.number().default(600_000),
  LLAMACPP_BIND_HOST: z.string().default('127.0.0.1'),
  // When true (default), the InferenceProxyManager scans assistant content
  // for `<think>…</think>` blocks and surfaces them as `reasoning_content`
  // (streaming) or `message.reasoning_content` (non-streaming) so they do
  // not leak into the user-visible content stream. Flip to false for the
  // pre-PR1 raw pass-through behaviour (debugging only).
  LLAMACPP_REASONING_EXTRACTION_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  // Launch tool-capable catalog entries with `--jinja`, which is what makes
  // llama-server render the GGUF's embedded chat template and PARSE emitted
  // tool calls into `message.tool_calls`. Without it a tool-capable model
  // still emits its call as raw text and nothing downstream can see it.
  //
  // Applied per catalog entry (only entries advertising the `tools`
  // capability), never globally — a GGUF whose template is not tool-aware can
  // fail to start under `--jinja`. This flag is the kill switch if an upstream
  // llama.cpp release regresses.
  LLAMACPP_ENABLE_JINJA: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  LLAMACPP_PROCESS_PORT_MIN: z.coerce.number().default(48_500),
  LLAMACPP_PROCESS_PORT_MAX: z.coerce.number().default(48_999),
  HUGGINGFACE_TOKEN: z.string().optional(),
  HUGGINGFACE_API_BASE: z.string().default('https://huggingface.co'),
  // HF auto-sync settings — discovers top trending GGUF models and adds them
  // to the FrontierCatalogEntry table. Runs on bootstrap + on this cron.
  HF_AUTO_SYNC_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  HF_AUTO_SYNC_CRON: z.string().default('0 0 4 * * *'),
  HF_AUTO_SYNC_TRENDING_LIMIT: z.coerce.number().int().min(0).max(200).default(40),
  HF_AUTO_SYNC_DOWNLOADS_LIMIT: z.coerce.number().int().min(0).max(200).default(40),
  HF_AUTO_SYNC_LIKES_LIMIT: z.coerce.number().int().min(0).max(200).default(40),
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

  static reset(): void {
    cachedConfig = undefined;
  }
}
