import { ModelCostClass } from '@claw/shared-types';
import { CostClass } from '../../../generated/prisma';

// Prisma models a native enum as a string-literal union; @claw/shared-types
// exposes the same values as a TypeScript string enum. The VALUES are identical
// (so the wire payload is unchanged), but the two types are not assignable to
// each other. Mapping explicitly keeps the whole path free of `as` casts, and
// the Record type means adding a class to either side without the other is a
// compile error rather than a runtime `undefined`.
export const PRISMA_TO_SHARED_COST_CLASS: Record<CostClass, ModelCostClass> = {
  [CostClass.FREE]: ModelCostClass.FREE,
  [CostClass.CHEAP]: ModelCostClass.CHEAP,
  [CostClass.STANDARD]: ModelCostClass.STANDARD,
  [CostClass.PREMIUM]: ModelCostClass.PREMIUM,
  [CostClass.ULTRA]: ModelCostClass.ULTRA,
};

// Local providers whose compute is not billed per token by an upstream vendor.
// Their cost comes from the platform's own hardware configuration instead.
export const LOCAL_COST_PROVIDERS: ReadonlyArray<string> = ['OLLAMA', 'LLAMACPP'];

/**
 * A trailing release date on a model id: `-20251001` or `-2024-08-06`.
 *
 * Anchored to the END so a date inside a name cannot be mistaken for a suffix,
 * and requiring the leading hyphen so a bare numeric model name survives intact.
 */
export const DATED_SNAPSHOT_SUFFIX = /-(?:\d{8}|\d{4}-\d{2}-\d{2})$/;

/**
 * Providers that resell or host many third-party models at many prices.
 * There is no "dearest rate the provider publishes" that means anything for
 * them, so an unpriced model on one of these is UNPRICED (refused), never
 * charged at a stand-in rate.
 */
export const AGGREGATOR_COST_PROVIDERS: ReadonlyArray<string> = [
  'OPENROUTER',
  'VERCEL_AI_GATEWAY',
  'HUGGING_FACE',
  'NVIDIA_NIM',
  'POLLINATIONS',
  'AI_HORDE',
];

/** Every operator-defined provider is an aggregator of unknown pricing. */
export const CUSTOM_COST_PROVIDER_PREFIX = 'CUSTOM_';

/** Provider-published prices above $1000 per million tokens are treated as a unit mix-up. */
export const SYNCED_PRICE_MAX_MICRO_USD_PER_MTOK = 1_000_000_000;

/**
 * A synced price that moves an existing price by more than this factor in
 * either direction is held back: far more likely a parse or unit error than a
 * real repricing, and an administrator can publish it deliberately.
 */
export const SYNCED_PRICE_MAX_CHANGE_FACTOR = 20;

/** Names listed in the coverage warning, so one log line stays readable. */
export const PRICE_COVERAGE_LOG_SAMPLE_SIZE = 20;
