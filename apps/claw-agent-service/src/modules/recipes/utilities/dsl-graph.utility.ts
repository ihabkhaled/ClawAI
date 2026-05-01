import type { RecipeDsl, RecipeStep } from '../types/recipe.types';

/**
 * Build the predecessors map for a recipe DSL: for each step, which
 * other steps must terminate before it becomes "ready" to propose.
 *
 * Two rules combine:
 *   1. If step A declares `on_success: ['B']`, B has predecessor A.
 *   2. If a step has NO `on_success` and the next step has no
 *      explicit predecessor in rule 1, the next step inherits the
 *      previous as a predecessor (gives v1 sequential semantics for
 *      free when authors don't declare on_success).
 *
 * Steps that share a `parallel_group` are NOT mutually dependent; they
 * fire concurrently when their predecessors are satisfied.
 */
export function buildPredecessors(dsl: RecipeDsl): Map<string, Set<string>> {
  const predecessors = new Map<string, Set<string>>();
  for (const step of dsl.steps) {
    predecessors.set(step.id, new Set());
  }

  // Rule 1 — explicit on_success declarations
  for (const step of dsl.steps) {
    if (step.on_success === undefined) continue;
    for (const childId of step.on_success) {
      predecessors.get(childId)?.add(step.id);
    }
  }

  // Rule 2 — implicit sequential fallback. Only fires when:
  //   (a) the current step has no predecessors from rule 1, AND
  //   (b) the previous step did NOT explicitly declare on_success.
  // If prev declared on_success (even an empty array), the author has
  // signalled they are managing dependencies explicitly — respect it.
  for (let i = 1; i < dsl.steps.length; i += 1) {
    const step = dsl.steps[i];
    const prev = dsl.steps[i - 1];
    if (step === undefined || prev === undefined) continue;
    if (prev.on_success !== undefined) continue;
    const stepPredecessors = predecessors.get(step.id);
    if (stepPredecessors !== undefined && stepPredecessors.size === 0) {
      stepPredecessors.add(prev.id);
    }
  }

  return predecessors;
}

/**
 * Find the named step in the DSL or return undefined.
 */
export function findStepById(dsl: RecipeDsl, id: string): RecipeStep | undefined {
  return dsl.steps.find((s) => s.id === id);
}
