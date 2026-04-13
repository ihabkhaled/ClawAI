export type VerifyMetadata = {
  verified: boolean;
  verifierScore: number;
  verifierIssues: string[];
  revisionCount: number;
};

export type VerifyResult = {
  content: string;
  metadata: VerifyMetadata;
};

export type SendVerifyPayload = {
  content: string;
  maxRevisions?: number;
};

export type SendVerifyResult = {
  messageId: string;
  threadId: string;
};

export type UseVerifyResultState = {
  content: string;
  metadata: VerifyMetadata;
};

export type UseSendVerifyResult = {
  send: (payload: SendVerifyPayload) => void;
  result: SendVerifyResult | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseVerifyPollResult = {
  verifyResult: UseVerifyResultState | null;
  isPolling: boolean;
  isVerifyReady: boolean;
  isVerifyError: boolean;
  handleViewInThread: () => void;
};

export type UseVerifyPageReturn = {
  t: (key: string, params?: Record<string, string | number>) => string;
  content: string;
  setContent: (value: string) => void;
  maxRevisions: number;
  setMaxRevisions: (value: number) => void;
  handleSend: () => void;
  canSend: boolean;
  isPending: boolean;
  isError: boolean;
  verifyResult: UseVerifyResultState | null;
  isPolling: boolean;
  isVerifyReady: boolean;
  isVerifyError: boolean;
  handleViewInThread: () => void;
};
