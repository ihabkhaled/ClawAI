import { ROLE_KEY_PREFIXES, SYSTEM_STEP_INFO } from '../constants/step-progress.constants';
import type { RoleStepInfo } from '../types/step-recorder.types';

/** The pipeline names each model call by a role key; this maps it to a stage and role kind. */
export function roleStepInfo(roleKey: string): RoleStepInfo {
  const match = ROLE_KEY_PREFIXES.find(({ prefix }) => roleKey.startsWith(prefix));
  return match?.info ?? SYSTEM_STEP_INFO;
}
