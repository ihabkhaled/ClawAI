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
