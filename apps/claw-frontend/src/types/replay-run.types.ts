import type { ReplayOutcomeLabel } from '@/enums';

import type { PaginationMeta } from './audit.types';
import type { LabelBreakdown } from './replay.types';

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

export type ReviewCaseRequest = {
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
  claudePrompt: string;
};

export type PromotedTestFixture = {
  caseId: string;
  testCode: string;
  testDescription: string;
};

export type RunComparisonDelta = {
  totalReplayed: number;
  changedCount: number;
  suspiciousCount: number;
  avgConfOldDelta: number;
  avgConfNewDelta: number;
  avgImprovementDelta: number;
  labelBreakdownDelta: Record<string, number>;
};

export type RunComparisonResult = {
  runA: ReplayRunSummary;
  runB: ReplayRunSummary;
  delta: RunComparisonDelta;
  improved: boolean;
};

export type ReplayRunsListResponse = {
  data: ReplayRunSummary[];
  meta: PaginationMeta;
};
