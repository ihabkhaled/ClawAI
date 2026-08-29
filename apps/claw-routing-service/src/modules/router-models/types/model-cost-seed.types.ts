import { type SeedApplyOutcome } from '../../../common/enums';
import { type CostClass } from '../../../generated/prisma';

/**
 * One model's bootstrap list price.
 *
 * Deliberately a narrow subset of `ModelCostVersion`. The per-unit modality
 * rates (image, audio, video, tool, search) are absent because no provider
 * publishes them per chat model, and a seeded `0` would read as "free" rather
 * than "not published" — `null` is the honest value and is what the row gets.
 *
 * Rates are integer micro-USD per MILLION tokens, held as `number` here and
 * widened to `bigint` at the Prisma boundary. Every value in this file is well
 * inside `Number.MAX_SAFE_INTEGER`; the widening exists so a future rate cannot
 * lose precision to a float.
 */
export interface ModelCostSeedEntry {
  provider: string;
  modelKey: string;
  inputPerMillionMicroUsd: number;
  outputPerMillionMicroUsd: number;
  /** The provider's cache-HIT input rate. Null when it publishes none. */
  cachedInputPerMillionMicroUsd: number | null;
  /** Null everywhere but Anthropic — no other provider bills a cache write. */
  cacheWritePerMillionMicroUsd: number | null;
  /**
   * Equal to the output rate on models that report a separate reasoning count,
   * null on models that do not. Never a different number: no provider bills
   * reasoning at anything other than its output rate.
   */
  reasoningPerMillionMicroUsd: number | null;
  costClass: CostClass;
}

/** What the seed repository applies, once, under an advisory lock. */
export interface ModelCostSeedInput {
  name: string;
  version: number;
  checksum: string;
  entries: readonly ModelCostSeedEntry[];
}

/**
 * Per-run counts, so the boot log says what actually happened.
 *
 * `skipped` is the number that matters on a re-run: it counts models that
 * already carried a price and were therefore left alone, which is how an
 * operator distinguishes "the seed filled an empty table" from "the seed found
 * everything already priced and touched nothing".
 */
export interface ModelCostSeedResult {
  outcome: SeedApplyOutcome;
  inserted: number;
  skipped: number;
}
