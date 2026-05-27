// Semantic Intent Analysis — Phase 2 of the semantic router flagship.
// See docs/03-architecture/semantic-router-flagship-plan.md §2 / §5 of the
// flagship prompt.
//
// The analyzer asks an Ollama router model to extract structured intent from
// the user prompt + thread context + weak keyword signals. It NEVER answers
// the user — only produces routing metadata. In Phase 2 the output is stored
// alongside the v1 routing decision (shadow mode); Phase 4 will promote it
// to a hot-path input for the AI route planner.

import type { RoutingMode } from '../../../generated/prisma';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ModalityKind =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'PDF'
  | 'FILE'
  | 'SPREADSHEET'
  | 'CODE';

export type SemanticAnalysisStatus =
  | 'SUCCESS'
  | 'INVALID_JSON_AFTER_RETRY'
  | 'OLLAMA_TIMEOUT'
  | 'OLLAMA_ERROR'
  | 'SKIPPED_FLAG_DISABLED'
  | 'SKIPPED_ROUTER_UNAVAILABLE';

// Input contract for the analyzer (flagship prompt §5.1, trimmed to what
// the routing-service can actually provide today — fields the chat-service
// will pass through in a later phase are marked optional).
export type SemanticIntentAnalyzerInput = {
  threadId: string;
  userId?: string;
  message: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  threadSummary?: string;
  followUpDetected?: boolean;
  followUpSignals?: string[];
  keywordSignals: Array<{
    category: string;
    matchedTerms: string[];
    confidenceBoost: number;
  }>;
  attachmentMetadata?: Array<{
    mimeType?: string;
    fileName?: string;
    sizeBytes?: number;
  }>;
  routingMode: RoutingMode;
  activePolicyName?: string;
  availableWorkflowKinds?: string[];
};

// Output contract (flagship prompt §5.2).
export type SemanticIntentAnalysis = {
  primaryIntent: string;
  secondaryIntents: string[];
  taskType: string;
  domainTags: string[];
  roleTags: string[];
  majorTags: string[];
  modalityNeeds: ModalityKind[];
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
  privacyClass: 'local' | 'cloud' | 'either' | 'unknown';
  riskLevel: RiskLevel;
  confidence: number;
  reasoningSummary: string;
  uncertaintyReasons: string[];
};

// Shape returned by the Ollama /generate endpoint when stream=false.
// Lives here (rather than as an inline type alias in the manager) so
// the routing-service ESLint `no-restricted-syntax` rule that bans
// inline type aliases stays happy.
export type OllamaGenerateAnalyzerResponse = {
  response: string;
  done?: boolean;
};

export type SemanticIntentAnalysisRecord = {
  status: SemanticAnalysisStatus;
  analysis: SemanticIntentAnalysis | null;
  // Raw model output for debugging when validation fails — capped to a
  // reasonable size so we don't blow up the JSON column.
  rawOutputExcerpt?: string;
  routerModel: string;
  attempts: number;
  durationMs: number;
  failureReason?: string;
};
