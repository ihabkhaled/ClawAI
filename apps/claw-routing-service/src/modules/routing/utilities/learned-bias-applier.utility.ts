// SCAFFOLD: stream R.1 (01-r1-learning-loop)
// Pure utility — extracts the bias math out of the manager for unit testability.

import type { CandidateModel } from '../types/learned-bias.types';

export type LearnedSignal = {
  provider: string;
  model: string;
  scoreDelta: number;
  sampleSize: number;
};

export function applyLearnedBias(
  _candidates: CandidateModel[],
  _signals: LearnedSignal[],
  _weightMax: number,
  _minSampleSize: number,
): CandidateModel[] {
  throw new Error(
    'SCAFFOLD-R1 — applyLearnedBias not implemented; see docs/15-ai-context/routing-flagship-streams/01-r1-learning-loop.md',
  );
}
