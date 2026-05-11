import { z } from 'zod';
import { RiskLevel } from '../../../common/enums';
import { DomainTag, ModalityKind, PrivacyClass, RoutingMode } from '../../../generated/prisma';

const dim = (): z.ZodNumber => z.number().min(-1).max(1);

const dimensionsObjectSchema = z.object({
  capability: dim(),
  domain: dim(),
  role: dim(),
  modality: dim(),
  cost: dim(),
  latency: dim(),
  health: dim(),
  privacy: dim(),
  learnedSuccess: dim(),
  judgeTrust: dim(),
  contextFit: dim(),
  uncertaintyPenalty: dim(),
  riskPenalty: dim(),
  fallbackReliability: dim(),
});

export const scoreRequestSchema = z.object({
  classification: z.object({
    domain: z.nativeEnum(DomainTag),
    secondaryDomain: z.nativeEnum(DomainTag).nullable().default(null),
    modalityIn: z.array(z.nativeEnum(ModalityKind)).max(20).default([]),
    modalityOut: z.array(z.nativeEnum(ModalityKind)).max(20).default([]),
    riskLevel: z.nativeEnum(RiskLevel),
    privacyClass: z.nativeEnum(PrivacyClass),
    confidence: z.number().min(0).max(1),
  }),
  policy: z.object({
    policyId: z.string().min(1).max(100),
    routingMode: z.nativeEnum(RoutingMode),
    weights: dimensionsObjectSchema.optional(),
  }),
  profileIds: z.array(z.string().min(1).max(100)).min(1).max(200),
});

export type ScoreRequestDto = z.infer<typeof scoreRequestSchema>;
