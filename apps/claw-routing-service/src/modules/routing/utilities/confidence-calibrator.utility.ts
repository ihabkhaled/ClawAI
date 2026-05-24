// SCAFFOLD: stream R.1 (01-r1-learning-loop)
// Rolling 30-day hit-rate calibration for routing-signal confidence constants.

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

export function calibrateConfidence(
  _signal: CalibrationSignal,
  _samples: CalibrationSample[],
  _windowDays: number,
  _fallbackConstant: number,
): number {
  throw new Error(
    'SCAFFOLD-R1 — calibrateConfidence not implemented; see docs/15-ai-context/routing-flagship-streams/01-r1-learning-loop.md',
  );
}
