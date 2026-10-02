// Inputs to the prompt-cache eligibility decision (F093); see
// utilities/anthropic-prompt-cache-policy.utility.ts for why each one refuses.
export type PromptCacheEligibilityInput = {
  provider: string;
  /** The administrator's per-model switch from the catalog. Default OFF. */
  catalogEnabled: boolean;
  /**
   * The call carries a native tool catalog. The native Messages transport here
   * has no tool_use reader, so such a turn stays on the compatible path.
   */
  carriesTools: boolean;
  /**
   * The caller already took the PAYG hold (compare reserves every lane up
   * front). That hold was sized without the write premium, and settlement is
   * capped at the hold, so the premium would be silently absorbed.
   */
  holdSuppliedByCaller: boolean;
};
