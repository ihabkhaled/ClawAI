// SCAFFOLD: stream R.1 (01-r1-learning-loop)
// Rolling 30-day hit-rate calibration for routing-signal confidence constants.

import type { CalibrationSample, CalibrationSignal } from '../types/calibration.types';

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
