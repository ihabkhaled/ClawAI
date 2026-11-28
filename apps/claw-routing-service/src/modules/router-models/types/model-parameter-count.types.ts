import { type ParameterCountOrigin, type SeedApplyOutcome } from '../../../common/enums';

/**
 * A model's size as its maker publishes it, in BILLIONS of parameters
 * (0.5 = 500M, 1000 = 1T). `activeBillions` is the per-token share of a
 * mixture-of-experts model (671 total / 37 active); null for a dense model or
 * one whose maker states no active figure.
 */
export type ParameterCount = {
  totalBillions: number;
  activeBillions: number | null;
};

/**
 * One maker-published count for a set of EXACT normalised model keys
 * (`normaliseModelKey`: lower case, the `org/` or `models/` prefix removed, any
 * `:tag` kept). An entry exists only where a maker's own page states the
 * number; every closed model (GPT, Claude, Gemini, Grok) is absent on purpose.
 */
export type PublishedParameterCountRule = {
  keys: readonly string[];
  totalBillions: number;
  activeBillions?: number;
  /** The maker page the number was read from. */
  source: string;
};

export type ResolvedParameterCount = ParameterCount & { origin: ParameterCountOrigin };

/** Input of the run-once parameter-count seed: ledger name, version and payload fingerprint. */
export type ModelParameterSeedInput = {
  name: string;
  version: number;
  checksum: string;
};

export type ModelParameterSeedResult = {
  outcome: SeedApplyOutcome;
  /** Registry rows that gained a count. */
  filled: number;
  /** Rows left alone: they already carried a count, an admin pinned the field, or no rule matched. */
  skipped: number;
};
