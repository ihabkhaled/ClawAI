import { z } from 'zod';
import { RiskLevel } from '../../../common/enums';
import {
  CostClass,
  DomainTag,
  LatencyClass,
  ModalityKind,
  PrivacyClass,
  RoutingMode,
} from '../../../generated/prisma';

export const classificationV2Schema = z.object({
  domain: z.nativeEnum(DomainTag),
  secondaryDomain: z.nativeEnum(DomainTag).nullable(),
  taskFamily: z.string().min(1).max(200),
  modalityIn: z.array(z.nativeEnum(ModalityKind)).max(20),
  modalityOut: z.array(z.nativeEnum(ModalityKind)).max(20),
  riskLevel: z.nativeEnum(RiskLevel),
  privacyClass: z.nativeEnum(PrivacyClass),
  confidence: z.number().min(0).max(1),
});

const fallbackEntrySchema = z.object({
  profileId: z.string().min(1).max(100),
  provider: z.string().min(1).max(64),
  modelKey: z.string().min(1).max(200),
  reason: z.string().min(1).max(200),
});

const scoreBreakdownEntrySchema = z.object({
  dimension: z.string().min(1).max(64),
  rawScore: z.number(),
  weight: z.number(),
  weightedScore: z.number(),
  reason: z.string().min(1).max(200),
});

const candidateSchema = z.object({
  profileId: z.string().min(1).max(100),
  totalScore: z.number().min(0).max(1),
});

const noExecutionModelIssueSchema = z.object({
  code: z.enum([
    'NO_HEALTHY_EXECUTION_MODEL',
    'NO_PRIVACY_COMPLIANT_MODEL',
    'NO_MODALITY_MATCH',
    'MANUAL_SELECTION_INVALID',
  ]),
  explanation: z.string().min(1).max(500),
  suggestedAction: z.string().min(1).max(500),
});

export const routingDecisionV2Schema = z.object({
  decisionId: z.string().min(1).max(100),
  selectedProfileId: z.string().min(1).max(100).nullable(),
  selectedProvider: z.string().min(1).max(64).nullable(),
  selectedModel: z.string().min(1).max(200).nullable(),
  runtimeType: z.enum(['CLOUD', 'OLLAMA', 'LLAMACPP', 'UNKNOWN']),
  routingMode: z.nativeEnum(RoutingMode),
  confidence: z.number().min(0).max(1),
  classification: classificationV2Schema,
  reasonTags: z.array(z.string().min(1).max(200)).max(50),
  scoreBreakdown: z.array(scoreBreakdownEntrySchema).max(50).nullable(),
  candidates: z.array(candidateSchema).max(50).nullable(),
  costClass: z.nativeEnum(CostClass).nullable(),
  latencyClass: z.nativeEnum(LatencyClass).nullable(),
  fallbackChain: z.array(fallbackEntrySchema).max(20),
  policyApplied: z.object({
    policyId: z.string().min(1).max(100),
    mode: z.nativeEnum(RoutingMode),
  }),
  noExecutionModelIssue: noExecutionModelIssueSchema.nullable(),
});
