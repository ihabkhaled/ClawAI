export type SensitivityPattern = {
  name: string;
  /** Must carry the `g` flag: every occurrence is masked, not only the first. */
  pattern: RegExp;
  /** Second-stage check for patterns that also match ordinary prose. */
  accept?: (match: string) => boolean;
};

export type MaskSecretsResult = {
  /** Same length as the input; only matched spans are starred out. */
  masked: string;
  /** Names of the patterns that fired, in pattern order. */
  matched: string[];
};
