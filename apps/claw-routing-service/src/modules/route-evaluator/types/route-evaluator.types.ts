import { type RiskLevel } from '../../../common/enums';
import {
  type CostClass,
  type DomainTag,
  type LatencyClass,
  type ModalityKind,
  type PrivacyClass,
  type RoutingMode,
} from '../../../generated/prisma';
import { type ScoreBreakdownEntry } from '../../scoring/types/scoring.types';

export type EvaluateInputV2 = {
  messageContent: string;
  attachedFileMimeTypes?: string[];
  routingMode?: RoutingMode;
  policyId?: string;
  forcedProvider?: string;
  forcedModel?: string;
  debug?: boolean;
};

export type ClassificationV2 = {
  domain: DomainTag;
  secondaryDomain: DomainTag | null;
  taskFamily: string;
  modalityIn: ModalityKind[];
  modalityOut: ModalityKind[];
  riskLevel: RiskLevel;
  privacyClass: PrivacyClass;
  confidence: number;
};

export type FallbackEntry = {
  profileId: string;
  provider: string;
  modelKey: string;
  reason: string;
};

export type NoExecutionModelIssue = {
  code:
    | 'NO_HEALTHY_EXECUTION_MODEL'
    | 'NO_PRIVACY_COMPLIANT_MODEL'
    | 'NO_MODALITY_MATCH'
    | 'MANUAL_SELECTION_INVALID';
  explanation: string;
  suggestedAction: string;
};

export type RoutingDecisionV2 = {
  decisionId: string;
  selectedProfileId: string | null;
  selectedProvider: string | null;
  selectedModel: string | null;
  runtimeType: 'CLOUD' | 'OLLAMA' | 'LLAMACPP' | 'UNKNOWN';
  routingMode: RoutingMode;
  confidence: number;
  classification: ClassificationV2;
  reasonTags: string[];
  scoreBreakdown: ScoreBreakdownEntry[] | null;
  candidates: { profileId: string; totalScore: number }[] | null;
  costClass: CostClass | null;
  latencyClass: LatencyClass | null;
  fallbackChain: FallbackEntry[];
  policyApplied: { policyId: string; mode: RoutingMode };
  noExecutionModelIssue: NoExecutionModelIssue | null;
};
