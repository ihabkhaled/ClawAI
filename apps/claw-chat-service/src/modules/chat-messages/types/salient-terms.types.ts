/**
 * The searchable content of a prompt, split by how discriminating it is.
 *
 * Kept as two lists rather than one ranked list because the caller does not
 * blend them — it picks identifiers when they exist and words otherwise. A
 * single list would hide that decision inside a sort order.
 */
export type SalientTerms = {
  /** Coined names: ORCHID-731, MERIDIAN-88. Highly discriminating. */
  identifiers: string[];
  /** Ordinary content words, longest first. Weakly discriminating. */
  words: string[];
};
