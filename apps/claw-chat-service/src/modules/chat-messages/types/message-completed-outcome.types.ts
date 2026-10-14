/** Overrides for the outcome published on MESSAGE_COMPLETED (default: success). */
export type MessageCompletedOutcomeOverrides = {
  executionSuccess?: boolean;
  finalStatus?: string;
  errorMessage?: string;
};
