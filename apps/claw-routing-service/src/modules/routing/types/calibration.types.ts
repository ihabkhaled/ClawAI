// SCAFFOLD: stream R.1 (01-r1-learning-loop)

export type CalibrationSignal =
  | 'EXACT_KEYWORD'
  | 'VERB_NOUN_COMBO'
  | 'CATEGORY_KEYWORD'
  | 'HEURISTIC_FALLBACK'
  | 'PRIVACY_ENFORCED';

export type CalibrationSample = {
  signal: CalibrationSignal;
  wasCorrect: boolean;
  occurredAt: Date;
};
