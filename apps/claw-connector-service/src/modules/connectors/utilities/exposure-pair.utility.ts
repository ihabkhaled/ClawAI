import { bareModelKey, modelMatchKey } from '@claw/shared-utilities';
import { type ModelPair } from '../types/exposure-pair.types';

/**
 * Every spelling a catalog row might store for `model`: the id as asked, its
 * bare form, and the Gemini `models/` form. The Gemini adapter stores
 * `models/gemini-2.5-flash`; routing, assistant roles and plans say
 * `gemini-2.5-flash`. An exact match refused the helper model a role had just
 * named (rule 42 item 13) — so the lookup widens, and the answer is mapped
 * back to what was asked.
 */
export function modelKeyVariants(model: string): string[] {
  const bare = bareModelKey(model);
  return [...new Set([model, bare, `models/${bare}`])];
}

/** The query pairs for a set of requested pairs, every catalog spelling included. */
export function expandExposurePairs(pairs: ReadonlyArray<ModelPair>): ModelPair[] {
  return pairs.flatMap((pair) =>
    modelKeyVariants(pair.model).map((model) => ({ provider: pair.provider, model })),
  );
}

/**
 * The requested pairs that match an exposed row under the shared normalizer,
 * returned exactly as the caller spelled them — callers compare the answer to
 * their own strings, so echoing the catalog spelling would break them.
 */
export function requestedPairsMatching(
  requested: ReadonlyArray<ModelPair>,
  exposedRows: ReadonlyArray<ModelPair>,
): ModelPair[] {
  const exposed = new Set(exposedRows.map((row) => modelMatchKey(row.provider, row.model)));
  return requested.filter((pair) => exposed.has(modelMatchKey(pair.provider, pair.model)));
}
