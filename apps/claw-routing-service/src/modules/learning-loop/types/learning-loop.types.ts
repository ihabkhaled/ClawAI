import { type FeedbackSignal } from '../../../common/enums';
import { type DomainTag } from '../../../generated/prisma';

export type LearnedScoreRecord = {
  id: string;
  profileKey: string;
  domain: DomainTag;
  taskFamily: string;
  successRate: number;
  feedbackPositive: number;
  feedbackNegative: number;
  judgeVerified: number;
  judgeRevised: number;
  judgeEscalated: number;
  fallbackTriggered: number;
  totalRoutes: number;
  lastUpdatedAt: Date;
  createdAt: Date;
};

export type RecordFeedbackInput = {
  profileKey: string;
  domain: DomainTag;
  taskFamily: string;
  signal: FeedbackSignal;
};

export type LearnedScoreCounterField =
  | 'feedbackPositive'
  | 'feedbackNegative'
  | 'judgeVerified'
  | 'judgeRevised'
  | 'judgeEscalated'
  | 'fallbackTriggered';
