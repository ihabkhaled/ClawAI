import type {
  ThreadGenerationFailure,
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
