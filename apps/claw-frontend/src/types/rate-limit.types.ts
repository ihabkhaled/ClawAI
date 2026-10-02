/** The i18n key and its parameters for "try again in N minutes". */
export type RateLimitMessage = {
  key: string;
  params?: Record<string, number>;
};
