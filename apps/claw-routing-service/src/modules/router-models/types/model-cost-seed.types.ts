import { type SeedApplyOutcome } from '../../../common/enums';
import { type CostClass } from '../../../generated/prisma';

/**
 * One model's bootstrap list price.
 *
 * Deliberately a narrow subset of `ModelCostVersion`. Chat models carry only
 * token rates: no provider publishes a per-unit rate for them, and a seeded `0`
 * would read as "free" rather than "not published" — `null` is the honest
 * value and is what the row gets.
 *
 * The OPTIONAL per-unit rates are for models billed per artifact instead:
 * `imagePerUnitMicroUsd` per generated image, `audioPerUnitMicroUsd` per
 * SECOND of input audio (speech-to-text), `ttsPerCharacterMicroUsd` per
 * character synthesised (text-to-speech). Omitted means null.
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
  imagePerUnitMicroUsd?: number | null;
  audioPerUnitMicroUsd?: number | null;
  ttsPerCharacterMicroUsd?: number | null;
  /**
   * Set when this entry CORRECTS a price an earlier seed version already wrote.
   *
   * The seed otherwise only fills gaps, so a wrong seeded price would survive
   * every later version. With this flag, a model whose ACTIVE row is still a
   * seeded list price (`source: SEED`, not an administrator override) and whose
   * rates differ gets its active row retired and a NEW version appended — never
   * an in-place edit. An override, a synced price or an identical price is left
   * alone.
   */
  supersedesSeededPrice?: boolean;
  /**
   * Set when this entry FILLS a gap for a model that was already callable
   * before the row existed, and so was priced by routing's provider-fallback
   * rate (the dearest TOKEN row of its provider). auth-service caches that
   * fallback answer for up to 300 s under this exact (provider, model) key, so
   * a freshly inserted row would otherwise be ignored until the TTL. When the
   * gap is filled this run, the model is reported in `repriced` and its
   * `routing.model_cost.published` event busts that cached fallback. Seed v8:
   * the Grok image rows, which fell back to `grok-4` and settled at $0.
   */
  replacesFallbackRate?: boolean;
}

/** One model the seed re-priced, so the caller can bust downstream rate caches. */
export interface ModelCostSeedRepricedModel {
  provider: string;
  modelKey: string;
  version: number;
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
  /**
   * Models whose EFFECTIVE price changed this run, so the caller busts
   * downstream rate caches for each: a seeded price superseded by a new
   * version, or a gap filled over a cached provider-fallback rate
   * (`replacesFallbackRate`).
   */
  repriced: readonly ModelCostSeedRepricedModel[];
}
