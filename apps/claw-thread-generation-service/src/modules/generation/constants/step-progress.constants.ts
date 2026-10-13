import type { ThreadGenerationStepOutcome, ThreadGenerationStepRoleKind } from '@claw/shared-types';

import type { RoleStepInfo } from '../types/step-recorder.types';

export const STEP_OUTCOMES: readonly ThreadGenerationStepOutcome[] = [
  'STARTED',
  'SUCCEEDED',
  'FAILED',
  'RETRY',
  'FALLBACK',
  'SKIPPED',
];

export const STEP_ROLE_KINDS: readonly ThreadGenerationStepRoleKind[] = [
  'AUTHOR',
  'JUDGE',
  'CRITIC',
  'RESEARCH',
  'SYSTEM',
];

export const SYSTEM_STEP_INFO: RoleStepInfo = { stage: 'SYSTEM', roleKind: 'SYSTEM' };

export const ROLE_KEY_PREFIXES: ReadonlyArray<{ prefix: string; info: RoleStepInfo }> = [
  { prefix: 'consensus-author-', info: { stage: 'CONSENSUS', roleKind: 'AUTHOR' } },
  { prefix: 'revision-author-', info: { stage: 'REVISION', roleKind: 'AUTHOR' } },
  { prefix: 'author-', info: { stage: 'AUTHOR_DRAFTS', roleKind: 'AUTHOR' } },
  { prefix: 'judge', info: { stage: 'JUDGE', roleKind: 'JUDGE' } },
  { prefix: 'critic', info: { stage: 'CRITIC', roleKind: 'CRITIC' } },
];
