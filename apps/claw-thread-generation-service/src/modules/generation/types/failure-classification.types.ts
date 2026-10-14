import type {
  ThreadFailureClass,
  ThreadFailurePhase,
  ThreadFailureRemedy,
} from '@claw/shared-types';

import type { ModelOutputFailureKind } from '../../../common/enums/model-output-failure-kind.enum';

/** The static facts about one failure class (see FAILURE_CLASS_INFO). */
export type FailureClassInfo = {
  /** The service itself changes something and tries again. */
  healable: boolean;
  /** Nothing on this side can help, so the ladder stops at once. */
  ownerOnly: boolean;
  /** A "Try again" from the panel, with or without changes, can help. */
  retryable: boolean;
  /** Remedies in the order the panel shows them. */
  remedies: readonly ThreadFailureRemedy[];
};

export type FailureInput = {
  code: string;
  httpStatus: number | null;
  /** Set when the failure is a refused reply: what kind of refusal it was. */
  outputKind?: ModelOutputFailureKind;
  /** The step's stage (AUTHOR_DRAFTS, JUDGE, ...), for the phase. */
  stage?: string;
  /** True when the refused reply broke the citation rules rather than the JSON shape. */
  citationRule?: boolean;
};

export type FailureClassification = FailureClassInfo & {
  failureClass: ThreadFailureClass;
  phase: ThreadFailurePhase;
};
