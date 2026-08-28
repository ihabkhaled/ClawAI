/** The SafeSearch block Cloud Vision returns, keyed by category. */
export type SafeSearchAnnotation = Record<string, string | undefined>;

/** One image's moderation outcome. */
export type ImageScanOutcome = {
  approved: boolean;
  /** Category names only — never the image or a pointer to it. */
  reason: string | null;
  /** False when the scan could not run at all, which is not a rejection. */
  completed: boolean;
};
