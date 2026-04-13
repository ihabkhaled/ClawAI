import type { OutcomeLabel } from '../../../generated/prisma';
import type { ReplayOutcomeLabel } from '../../../common/enums/replay-outcome-label.enum';
import type { LabelBreakdown } from './replay.types';

export type CreateReplayCaseData = {
  runId: string;
  decisionId?: string;
  messagePreview: string;
  messageContent?: string;
  hasOriginalContent: boolean;
  oldProvider: string;
  oldModel: string;
  oldConfidence?: number;
  oldCostClass?: string;
  newProvider: string;
  newModel: string;
  newConfidence: number;
  newCostClass: string;
  changed: boolean;
  improvementScore: number;
  outcomeLabel: OutcomeLabel;
  isSuspicious: boolean;
  suspiciousReasons: string[];
};

export type CreateReplayRunData = {
  name?: string;
  filters: Record<string, string | number | null>;
  totalReplayed: number;
  changedCount: number;
  suspiciousCount: number;
  avgConfOld: number;
  avgConfNew: number;
  avgImprovement: number;
  labelBreakdown: LabelBreakdown;
};

export type ReplayRunSummary = {
  id: string;
  name: string | null;
  totalReplayed: number;
  changedCount: number;
  suspiciousCount: number;
  avgConfOld: number;
  avgConfNew: number;
  avgImprovement: number;
  labelBreakdown: LabelBreakdown;
  createdAt: string;
};

export type ReplayCaseDetail = {
  id: string;
  runId: string;
  decisionId: string | null;
  messagePreview: string;
  messageContent: string | null;
  hasOriginalContent: boolean;
  oldProvider: string;
  oldModel: string;
  oldConfidence: number | null;
  oldCostClass: string | null;
  newProvider: string;
  newModel: string;
  newConfidence: number;
  newCostClass: string;
  changed: boolean;
  improvementScore: number;
  outcomeLabel: ReplayOutcomeLabel;
  isSuspicious: boolean;
  suspiciousReasons: string[];
  isConfirmedRegression: boolean;
  reviewNotes: string | null;
  isPromoted: boolean;
  reviewedAt: string | null;
  createdAt: string;
};

export type ReviewCaseData = {
  isConfirmedRegression: boolean;
  reviewNotes?: string;
};

export type ExportCaseDecision = {
  provider: string;
  model: string;
  confidence: number | null;
  costClass: string | null;
};

export type ExportCase = {
  id: string;
  messagePreview: string;
  originalPrompt: string | null;
  originalDecision: ExportCaseDecision;
  replayDecision: ExportCaseDecision;
  outcomeLabel: string;
  suspiciousReasons: string[];
  improvementScore: number;
};

export type ExportBundle = {
  runId: string;
  runName: string | null;
  exportedAt: string;
  totalCases: number;
  cases: ExportCase[];
};
