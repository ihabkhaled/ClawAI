import { type StreamEventType } from '../../../common/enums';

export type StreamEvent = {
  threadId: string;
  type: StreamEventType;
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  failedProvider?: string;
  failedModel?: string;
  attempt?: number;
  totalCandidates?: number;
  nextProvider?: string;
  nextModel?: string;
};
