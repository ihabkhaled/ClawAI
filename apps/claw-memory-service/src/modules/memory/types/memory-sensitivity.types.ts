import type { MemorySensitivity } from '../../../generated/prisma';

export type SensitivityVerdict = {
  verdict: MemorySensitivity;
  confidence: number;
  reason: string | null;
  redactedPreview: string | null;
};
