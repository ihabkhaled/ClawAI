export const QUALITY_THRESHOLDS = {
  MIN_RESPONSE_LENGTH: 20,
  MIN_WORD_COUNT: 5,
  MAX_REROUTE_ATTEMPTS: 2,
  WEAK_SCORE_THRESHOLD: 0.4,
  ERROR_PATTERNS: [
    'I cannot',
    'I am unable',
    'As an AI',
    'I apologize, but I',
    'I do not have the ability',
    'Sorry, I cannot',
    'I am not able to',
    'Error:',
    'Failed to',
  ],
  REPETITION_THRESHOLD: 0.6,
  ECHO_SIMILARITY_THRESHOLD: 0.8,
} as const;

export const QUALITY_SCORE_PENALTIES = {
  TOO_SHORT: 0.4,
  TOO_FEW_WORDS: 0.3,
  ERROR_PATTERN: 0.5,
  EXCESSIVE_REPETITION: 0.3,
  ECHO_RESPONSE: 0.5,
} as const;

export const MIN_WORDS_FOR_REPETITION_CHECK = 10;
