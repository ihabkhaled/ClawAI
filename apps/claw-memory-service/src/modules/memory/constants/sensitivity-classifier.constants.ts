/**
 * Tuple of valid verdict strings used by the Ollama sensitivity classifier.
 * Extracted from the manager to satisfy the no-string-literal-union rule —
 * the Zod enum schema consumes this tuple at the module level.
 */
import { z } from 'zod';

export const CLASSIFIER_VERDICTS = ['NORMAL', 'SENSITIVE', 'REDACTED'] as const;

export const classifierResponseSchema = z.object({
  verdict: z.enum(CLASSIFIER_VERDICTS),
  reason: z.string().max(255).optional().default(''),
  confidence: z.number().min(0).max(1).optional().default(0.7),
});
