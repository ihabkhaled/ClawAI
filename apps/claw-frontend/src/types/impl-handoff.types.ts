import type { ImplHandoffMode } from '../enums/impl-handoff-mode.enum';
import type { ImplHandoffStatus } from '../enums/impl-handoff-status.enum';

import type { TranslateFunction } from './i18n.types';

export type HandoffPayload = {
  id: string;
  sourceQueueId: string;
  userId: string;
  mode: ImplHandoffMode;
  targetThreadId: string | null;
  targetTerminalCommandId: string | null;
  status: ImplHandoffStatus;
  errorMessage: string | null;
  briefSnippet: string;
  createdAt: string;
  deliveredAt: string | null;
};

export type InitiateHandoffRequest = {
  mode: ImplHandoffMode;
};

export type FanoutResponse = {
  parentQueueId: string;
  createdQueueIds: string[];
  skippedCount: number;
};

export type ImplHandoffPickerProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (mode: ImplHandoffMode) => Promise<void>;
  isPending: boolean;
  defaultMode?: ImplHandoffMode;
  errorMessage: string | null;
  fallbackHint: string | null;
  t: TranslateFunction;
};

export type ImplHandoffsPageRenderProps = {
  handoffs: HandoffPayload[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  t: TranslateFunction;
};

export type UseImplHandoffPickerResult = {
  open: boolean;
  setOpen: (next: boolean) => void;
  isPending: boolean;
  errorMessage: string | null;
  fallbackHint: string | null;
  initiate: (queueId: string, mode: ImplHandoffMode) => Promise<HandoffPayload | null>;
};
