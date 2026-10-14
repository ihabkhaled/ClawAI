import type {
  ThreadFailureRemedy,
  ThreadGenerationFailure,
  ThreadGenerationHealing,
  ThreadHealingAttempt,
  ThreadGenerationSelections,
  ThreadGenerationProgress,
  ThreadGenerationStep,
  ThreadGenerationStepRoleKind,
} from '@claw/shared-types';

import type { ModelSelection } from '@/types/component.types';
import type {
  ThreadGenerationFormController,
  ThreadPublicationDetailController,
} from '@/types/thread-publication.types';
import type { ThreadRecommendedTeam } from '@/types/thread-recommended-team.types';

/** A translatable message: the i18n key plus its `{placeholders}`. */
export type ThreadErrorMessage = {
  key: string;
  params?: Record<string, string>;
};

/** An i18n key plus its placeholder values, for text built from parts. */
export type ThreadI18nText = {
  key: string;
  params: Record<string, string>;
};

export type ThreadFailureKeys = {
  messageKey: string;
  hintKey: string;
  params: Record<string, string>;
};

export type ThreadRetryResponse = { jobId: string; status: string };

export type ThreadRetryRoleSelection = {
  roleId: string;
  roleKind: ThreadGenerationStepRoleKind;
  model: ModelSelection;
};

export type ThreadRetryFormController = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  topic: string;
  setTopic: (value: string) => void;
  spendCapUsd: string;
  setSpendCapUsd: (value: string) => void;
  roles: ThreadRetryRoleSelection[];
  changeModel: (roleId: string, model: ModelSelection) => void;
  submit: () => void;
  isSubmitting: boolean;
  error: ThreadErrorMessage | null;
};

/** One button of the recovery panel: the remedy and the words it carries. */
export type ThreadRecoveryAction = {
  remedy: ThreadFailureRemedy;
  labelKey: string;
  params: Record<string, string>;
  /** True for a remedy that sends one retry request; false when it opens the form or a page. */
  oneClick: boolean;
};

export type ThreadRecoveryController = {
  actions: ThreadRecoveryAction[];
  run: (remedy: ThreadFailureRemedy) => void;
  /** The remedy whose request is in flight, or null. */
  pending: ThreadFailureRemedy | null;
  error: ThreadErrorMessage | null;
  /** Where "Add credit" goes. */
  addCreditHref: string;
};

export type ThreadRecoveryPanelProps = {
  failure: ThreadGenerationFailure;
  healing: ThreadGenerationHealing | undefined;
  recovery: ThreadRecoveryController;
};

export type ThreadHealingNoticeProps = { healing: ThreadGenerationHealing };

export type ThreadHealingAttemptView = {
  attempt: ThreadHealingAttempt;
  messageKey: string;
  model: string;
};

export type BuildRecoveryRetryInput = {
  remedy: ThreadFailureRemedy;
  progress: ThreadGenerationProgress;
  idempotencyKey: string;
  team: ThreadRecommendedTeam | null;
};

export type ThreadDeleteController = {
  isOpen: boolean;
  setOpen: (value: boolean) => void;
  confirm: () => void;
  isDeleting: boolean;
  error: ThreadErrorMessage | null;
};

export type ThreadProgressPanelController = {
  progress: ThreadGenerationProgress | undefined;
  isLoading: boolean;
  error: ThreadErrorMessage | null;
  pollingPaused: boolean;
  /** True when the pause came from repeated errors rather than the poll budget. */
  pollingPausedByErrors: boolean;
  isRunning: boolean;
  canRetry: boolean;
  retry: ThreadRetryFormController;
  recovery: ThreadRecoveryController;
  remove: ThreadDeleteController;
};

export type ThreadProgressPanelProps = {
  publicationId: string;
  /** Delete is offered only while the Thread is not live. */
  canDelete: boolean;
  onCancel: () => void;
  isCancelling: boolean;
};

export type ThreadFailureCardProps = {
  failure: ThreadGenerationFailure;
  /** Role kind of the failed role, when the step list names it. */
  roleKind: ThreadGenerationStepRoleKind | null;
  /** True when the platform caused the failure and gave the Free allowance back. */
  allowanceRefunded?: boolean;
};

export type ThreadStepItemProps = { step: ThreadGenerationStep };

export type BuildThreadRetryRequestInput = {
  progress: ThreadGenerationProgress;
  idempotencyKey: string;
  topic: string;
  spendCapUsd: string;
  roles: ThreadRetryRoleSelection[];
};

export type UseThreadGenerationProgressResult = {
  progress: ThreadGenerationProgress | undefined;
  isLoading: boolean;
  error: ThreadErrorMessage | null;
  /** True once the poll budget is spent on a job that is still running. */
  pollingPaused: boolean;
  /** True when the pause came from repeated errors rather than the poll budget. */
  pollingPausedByErrors: boolean;
};

export type ThreadErrorNoticeProps = { message: ThreadErrorMessage };

export type ThreadGenerationRetryFormProps = { form: ThreadRetryFormController };

export type ThreadGenerationDeleteDialogProps = { remove: ThreadDeleteController };

export type ThreadGenerationSelectionsViewProps = { selections: ThreadGenerationSelections };

export type ThreadGenerationTimelineProps = { steps: ThreadGenerationStep[] };

export type ThreadGenerationFormProps = { form: ThreadGenerationFormController };

export type ThreadPublicationDetailProps = { detail: ThreadPublicationDetailController };
