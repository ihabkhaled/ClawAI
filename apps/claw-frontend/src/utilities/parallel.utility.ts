import type { ParallelModelResponse } from '@/types';

export function getFastestModel(responses: ParallelModelResponse[]): string | null {
  const completed = responses.filter((r) => r.status === 'completed');
  if (completed.length === 0) {
    return null;
  }
  const fastest = completed.reduce((prev, curr) =>
    curr.latencyMs < prev.latencyMs ? curr : prev,
  );
  return fastest.model;
}
