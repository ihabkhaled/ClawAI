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
}
