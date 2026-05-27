// Phase 8 UI transparency — frontend mirror of the routing-service
// SemanticIntentAnalysisRecord and SemanticIntentAnalyzerInput shapes.
// Field names match the BE DTO verbatim (rule: FE type field names MUST
// mirror BE DTO/Prisma field names).

import type {
  RoutingMode,
  SemanticAnalysisStatusEnum,
  SemanticMessageRoleEnum,
  SemanticModalityKindEnum,
  SemanticPrivacyClassEnum,
  SemanticRiskLevelEnum,
} from '@/enums';

export type SemanticAnalysisStatus = `${SemanticAnalysisStatusEnum}`;

export type SemanticRiskLevel = `${SemanticRiskLevelEnum}`;

export type SemanticPrivacyClass = `${SemanticPrivacyClassEnum}`;

export type SemanticModalityKind = `${SemanticModalityKindEnum}`;

export type SemanticMessageRole = `${SemanticMessageRoleEnum}`;

export type SemanticRecentMessage = {
  role: SemanticMessageRole;
  content: string;
};

export type SemanticKeywordSignal = {
  category: string;
  matchedTerms: string[];
  confidenceBoost: number;
};

export type SemanticIntentAnalysis = {
  primaryIntent: string;
  secondaryIntents: string[];
  taskType: string;
  domainTags: string[];
  roleTags: string[];
  majorTags: string[];
  modalityNeeds: SemanticModalityKind[];
  expectedOutputType: string;
  requiresSearch: boolean;
  requiresExtraction: boolean;
  requiresFileAnalysis: boolean;
  requiresImageAnalysis: boolean;
  requiresVideoAnalysis: boolean;
  requiresAudioTranscription: boolean;
  requiresSpreadsheetAnalysis: boolean;
  requiresToolCalling: boolean;
  requiresStreaming: boolean;
  requiresLongContext: boolean;
  requiresStructuredOutput: boolean;
  requiresJudge: boolean;
  requiresCompare: boolean;
  privacyClass: SemanticPrivacyClass;
  riskLevel: SemanticRiskLevel;
  confidence: number;
  reasoningSummary: string;
  uncertaintyReasons: string[];
};

export type SemanticIntentAnalysisRecord = {
  status: SemanticAnalysisStatus;
  analysis: SemanticIntentAnalysis | null;
  rawOutputExcerpt?: string;
  routerModel: string;
  attempts: number;
  durationMs: number;
  failureReason?: string;
};

export type AnalyzeSemanticRequest = {
  message: string;
  routingMode?: RoutingMode;
  threadId?: string;
  recentMessages?: SemanticRecentMessage[];
  threadSummary?: string;
  followUpDetected?: boolean;
  followUpSignals?: string[];
  keywordSignals?: SemanticKeywordSignal[];
  activePolicyName?: string;
  availableWorkflowKinds?: string[];
};
