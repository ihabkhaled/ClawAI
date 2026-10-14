import type { ThreadModelRef } from '@claw/shared-types';

import type { ProgressRequest } from '../types/generation-progress-source.types';
import type { StepRow } from '../types/step-recorder.types';
import { candidateKey } from './healing-candidates.utility';

/**
 * The model the panel offers for the failed role: the first backup the owner chose, then the
 * plan-allowed pool, then the safe default, skipping anything that already failed this role in
 * the job. Null when the role has nothing left to offer (the panel then offers the picker).
 */
export function suggestModel(
  request: ProgressRequest,
  roleId: string | null,
  steps: readonly StepRow[],
): ThreadModelRef | null {
  const role = [...request.authors, request.judge, request.critic].find(({ id }) => id === roleId);
  if (!role) return null;
  const failed = new Set(
    steps
      .filter(
        (step) =>
          step.roleId === roleId &&
          step.outcome === 'FAILED' &&
          step.provider !== null &&
          step.model !== null,
      )
      .map((step) => candidateKey({ provider: step.provider ?? '', model: step.model ?? '' })),
  );
  failed.add(candidateKey(role));
  const options: ThreadModelRef[] = [
    ...role.fallbacks,
    ...(request.healing?.pool ?? []),
    ...(request.healing?.safeDefault ? [request.healing.safeDefault] : []),
  ];
  const pick = options.find((option) => !failed.has(candidateKey(option)));
  return pick ? { provider: pick.provider, model: pick.model } : null;
}
