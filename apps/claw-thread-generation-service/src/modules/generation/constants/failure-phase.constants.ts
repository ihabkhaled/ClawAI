import { ThreadFailurePhase } from '@claw/shared-types';

/** Step stage -> the phase the owner sees. Research is the plan: it fixes what the authors may cite. */
export const PHASE_BY_STAGE: ReadonlyMap<string, ThreadFailurePhase> = new Map([
  ['QUEUE', ThreadFailurePhase.QUEUE],
  ['SNAPSHOT', ThreadFailurePhase.SNAPSHOT],
  ['RESEARCH', ThreadFailurePhase.RESEARCH],
  ['AUTHOR_DRAFTS', ThreadFailurePhase.AUTHOR],
  ['CONSENSUS', ThreadFailurePhase.CONSENSUS],
  ['REVISION', ThreadFailurePhase.CONSENSUS],
  ['JUDGE', ThreadFailurePhase.JUDGE],
  ['CRITIC', ThreadFailurePhase.CRITIC],
  ['READY_FOR_REVIEW', ThreadFailurePhase.FINALIZE],
  ['GENERATION', ThreadFailurePhase.FINALIZE],
]);
