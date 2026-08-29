/**
 * Which ceiling stopped a message, as far as the transcript needs to say.
 *
 * Named by what the user hit rather than by the backend code, because several
 * codes land on the same sentence and the copy is what this drives. A toast
 * could get away with one generic string; a line that stays in the conversation
 * has to say which limit, over what window.
 */
export enum ChatLimitKind {
  DailyTokens = 'DAILY_TOKENS',
  WeeklyTokens = 'WEEKLY_TOKENS',
  MonthlyTokens = 'MONTHLY_TOKENS',
  DailyChats = 'DAILY_CHATS',
  DailyMessages = 'DAILY_MESSAGES',
  /** The Free plan is a 30-day trial; day 31 is a wall, not a quota. */
  TrialExpired = 'TRIAL_EXPIRED',
  /** The plan does not include the feature this message needed. */
  FeatureDisabled = 'FEATURE_DISABLED',
  /** The pay-as-you-go wallet cannot fund even a minimal answer. */
  PaygCreditExhausted = 'PAYG_CREDIT_EXHAUSTED',
  /** The prompt alone costs more than the whole remaining balance. */
  PaygPromptTooExpensive = 'PAYG_PROMPT_TOO_EXPENSIVE',
  /** The model has no published price, so it cannot be metered — never free. */
  PaygModelUnpriced = 'PAYG_MODEL_UNPRICED',
  /**
   * OUR pricing lookup is down. Deliberately its own kind: the user's wallet
   * is fine, and copy that blames it would sell a top-up nobody needed.
   */
  PaygPricingUnavailable = 'PAYG_PRICING_UNAVAILABLE',
}
