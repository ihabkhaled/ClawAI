import { z } from 'zod';

const appConfigSchema = z.object({
  FILES_DATABASE_URL: z.string().min(1, 'FILES_DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Slice C backend 3 — entitlements adapter calls auth-service to resolve the
  // caller's plan + permission set when @RequirePermissions decorators fire.
  AUTH_SERVICE_URL: z.string().min(1).default('http://auth-service:4001'),
  FILES_PORT: z.string().default('4006'),
  FILE_STORAGE_PATH: z.string().default('/data/uploads'),
  CLAMAV_HOST: z.string().default('clamav'),
  CLAMAV_PORT: z.coerce.number().default(3310),
  CLAMAV_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  // Stream 22 — service-to-service auth for /upload-internal + /download-internal
  INTER_SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'INTER_SERVICE_AUTH_TOKEN must be at least 32 chars')
    .default('change-me-inter-service-token-32-chars-min'),

  // Slice C foundation 3 — file retention sweeper
  // Days after upload before a file is eligible for retention deletion. 0 = disabled (files live forever).
  FILE_RETENTION_DAYS: z.coerce.number().int().min(0).default(30),
  // Cron expression (5-field) for the nightly retention sweep.
  FILE_RETENTION_SWEEP_CRON: z.string().default('0 2 * * *'),
  // Max number of expired files deleted per sweep tick (keeps DB locks short).
  FILE_RETENTION_SWEEP_BATCH_LIMIT: z.coerce.number().int().min(1).default(100),

  // Slice C foundation 3 — ZIP archive expansion guardrails
  // Hard cap on total uncompressed bytes (MB) extracted from a single archive.
  ZIP_MAX_EXTRACTED_SIZE_MB: z.coerce.number().int().min(1).default(500),
  // Hard cap on number of entries (files + directories) inside an archive.
  ZIP_MAX_ENTRY_COUNT: z.coerce.number().int().min(1).default(10000),
  // Max archive-inside-archive nesting depth before rejection.
  ZIP_MAX_NESTING_DEPTH: z.coerce.number().int().min(1).default(5),
  // Suspicious compression ratio (uncompressed / compressed). Above this = ZIP bomb.
  ZIP_COMPRESSION_RATIO_THRESHOLD: z.coerce.number().int().min(1).default(1000),
  // Temporary extraction path (should be tmpfs/ramdisk in production).
  ZIP_TEMP_EXTRACTION_PATH: z.string().default('/tmp/claw-zip-extraction'),

  // ─── Slice D foundation 3 — OCR pipeline (tesseract worker) ────────────
  // Off by default. When enabled, scanned PDFs (extracted-text char count
  // below SCANNED_PDF_CHAR_THRESHOLD) and images bound for text-only models
  // are routed through a tesseract worker pool. OCR results are cached on
  // the File row so the work is done once per upload, not per attachment.
  // See docs/03-architecture/compare-file-attachments.md (Slice D close-out).
  OCR_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OCR_CONFIDENCE_MIN: z.coerce.number().min(0).max(1).default(0.5),
  OCR_LANGUAGE: z.string().min(1).default('eng'),
  OCR_WORKER_THREADS: z.coerce.number().int().min(1).max(16).default(2),
  // Char count below which a PDF's extracted text is treated as "scanned"
  // and routed to OCR. 100 chars catches the common "letter-of-employment.pdf"
  // case where the PDF wraps a single full-page image with no real text layer.
  SCANNED_PDF_CHAR_THRESHOLD: z.coerce.number().int().min(0).default(100),
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
