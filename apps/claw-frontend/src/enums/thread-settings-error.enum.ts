// Field-level validation outcomes for the chat thread-settings form. Kept as an
// enum (not a string union) per the frontend declaration-ownership rule, and
// mapped to i18n keys by the controller hook rather than carrying user-facing
// text itself.
export enum ThreadSettingsError {
  MaxTokensNotInteger = 'MaxTokensNotInteger',
  MaxTokensOutOfRange = 'MaxTokensOutOfRange',
  QualityThresholdOutOfRange = 'QualityThresholdOutOfRange',
  MaxReRouteAttemptsOutOfRange = 'MaxReRouteAttemptsOutOfRange',
}
