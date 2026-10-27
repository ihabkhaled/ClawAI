import { z } from 'zod';

export type BlockerSplit = { evidenceGaps: string[]; others: string[] };

export type EvidenceMerge = {
  bundle: Record<string, unknown>;
  sha256: string;
  /** Ids of the items this merge added, in bundle order. */
  addedIds: string[];
};

export type RawEvidenceItem = Record<string, unknown>;

/** What a failed review leaves in its step excerpt: score, minimum and the blocker texts. */
export const reviewVerdictRecordSchema = z.object({
  score: z.number(),
  minScore: z.number(),
  blockers: z.array(z.string()),
  /** The model that actually answered, so a fallback review is never mistaken for the chosen one. */
  reviewer: z.object({ provider: z.string(), model: z.string(), fallback: z.boolean() }).optional(),
});

export type ReviewVerdictRecord = z.infer<typeof reviewVerdictRecordSchema>;
