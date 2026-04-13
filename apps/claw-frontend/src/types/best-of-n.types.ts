import type { TranslateFunction } from './i18n.types';

export type CandidateResult = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  qualityScore: number;
  qualityReasons: string[];
  rank: number;
};

export type BestOfNMetadata = {
  bestOfN: true;
  candidates: CandidateResult[];
  bestRank: number;
};

export type BestOfNResultState = {
  content: string;
  metadata: BestOfNMetadata;
};

export type BestOfNRequest = {
  content: string;
  threadId?: string;
  n: number;
  models?: string[];
};

export type BestOfNResponse = {
  messageId: string;
  threadId: string;
};

export type UseBestOfNSendResult = {
  send: (data: BestOfNRequest) => void;
  result: BestOfNResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseBestOfNPollResult = {
  bestOfNResult: BestOfNResultState | null;
  isPolling: boolean;
  isBestOfNReady: boolean;
  isBestOfNError: boolean;
  handleViewInThread: () => void;
};

export type UseBestOfNPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (v: string) => void;
  n: number;
  setN: (n: number) => void;
  handleSend: () => void;
  canSend: boolean;
  isPending: boolean;
  isError: boolean;
  bestOfNResult: BestOfNResultState | null;
  isPolling: boolean;
  isBestOfNReady: boolean;
  isBestOfNError: boolean;
  handleViewInThread: () => void;
};
