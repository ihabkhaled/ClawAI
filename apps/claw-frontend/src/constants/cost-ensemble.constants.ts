export const COST_ENSEMBLE_POLL_INTERVAL_MS = 2000;
export const MAX_COST_ENSEMBLE_POLL_COUNT = 90;
export const COST_ENSEMBLE_POLL_MESSAGES_LIMIT = 10;
export const COST_ENSEMBLE_AUTO_NAVIGATE_DELAY_MS = 3000;
export const COST_ENSEMBLE_CONTENT_MIN_LENGTH = 10;

export const COST_TIER_STYLES: Record<string, string> = {
  single: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  duo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  trio: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const COST_TIER_LABEL_KEYS: Record<string, string> = {
  single: 'costEnsemble.tierSingle',
  duo: 'costEnsemble.tierDuo',
  trio: 'costEnsemble.tierTrio',
};
