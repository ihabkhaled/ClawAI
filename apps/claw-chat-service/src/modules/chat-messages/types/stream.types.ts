import { type ProgressActorType, type StreamEventType } from '../../../common/enums';

export type VisibleProgressStatus = 'queued' | 'active' | 'completed' | 'error';

export type StreamEvent = {
  eventId?: string;
  threadId: string;
  type: StreamEventType;
  sequence?: number;
  stageId?: string;
  status?: VisibleProgressStatus;
  createdAt?: string;
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  label?: string;
  description?: string;
  actorType?: ProgressActorType;
  actorName?: string;
  failedProvider?: string;
  failedModel?: string;
  attempt?: number;
  totalCandidates?: number;
  nextProvider?: string;
  nextModel?: string;
  criticModel?: string;
  judgeModel?: string;
};
