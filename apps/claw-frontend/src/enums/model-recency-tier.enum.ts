/**
 * Where a model sits in the picker's ordering.
 *
 * Two tiers only, because every extra tier is a judgement nobody can check
 * against data. `PINNED_SNAPSHOT` is a dated variant of a model whose plain
 * alias is already listed above it — it exists for reproducibility, and almost
 * nobody choosing a model from a list wants it.
 */
export enum ModelRecencyTier {
  CANONICAL = 0,
  PINNED_SNAPSHOT = 1,
}
