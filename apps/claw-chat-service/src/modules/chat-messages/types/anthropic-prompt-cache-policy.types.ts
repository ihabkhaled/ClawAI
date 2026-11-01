// Inputs to the prompt-cache eligibility decision (F093); see
// utilities/anthropic-prompt-cache-policy.utility.ts for why each one refuses.
export type PromptCacheEligibilityInput = {
  provider: string;
  /** The administrator's per-model switch from the catalog. Default OFF. */
  catalogEnabled: boolean;
  /**
   * The call carries a tool catalog the native body cannot express (over the
   * byte budget, unknown dialect). A tool-less native request would make the run
   * a silent no-op, so such a turn stays on the compatible path. A catalog that
   * does fit rides the native body and is cached with the rest of the prefix.
   */
  toolsUnavailable: boolean;
  /**
   * The caller already took the PAYG hold (compare reserves every lane up
   * front). That hold was sized without the write premium, and settlement is
   * capped at the hold, so the premium would be silently absorbed.
   */
  holdSuppliedByCaller: boolean;
};
