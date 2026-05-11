import { RiskLevel } from '../../../common/enums';
import {
  DomainTag,
  ModalityKind,
  PrivacyClass,
  RoutingMode,
} from '../../../generated/prisma';
import { routingDecisionV2Schema } from '../schemas/routing-decision-v2.schema';

const baseValid = {
  decisionId: 'd-1',
  selectedProfileId: 'p-1',
  selectedProvider: 'OPENAI',
  selectedModel: 'gpt-4o',
  runtimeType: 'CLOUD' as const,
  routingMode: RoutingMode.AUTO,
  confidence: 0.8,
  classification: {
    domain: DomainTag.CODING,
    secondaryDomain: null,
    taskFamily: 'coding-direct',
    modalityIn: [ModalityKind.TEXT],
    modalityOut: [ModalityKind.TEXT],
    riskLevel: RiskLevel.LOW,
    privacyClass: PrivacyClass.CLOUD_PERMITTED,
    confidence: 0.9,
  },
  reasonTags: ['classifier_hit'],
  scoreBreakdown: null,
  candidates: null,
  costClass: null,
  latencyClass: null,
  fallbackChain: [],
  policyApplied: { policyId: 'default', mode: RoutingMode.AUTO },
  noExecutionModelIssue: null,
};

describe('routingDecisionV2Schema', () => {
  it('accepts a valid decision', () => {
    expect(routingDecisionV2Schema.safeParse(baseValid).success).toBe(true);
  });

  it('rejects confidence > 1', () => {
    const bad = { ...baseValid, confidence: 1.5 };
    expect(routingDecisionV2Schema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown runtimeType', () => {
    const bad = { ...baseValid, runtimeType: 'MYSTERY' };
    expect(routingDecisionV2Schema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown noExecutionModelIssue code', () => {
    const bad = {
      ...baseValid,
      noExecutionModelIssue: {
        code: 'BOGUS',
        explanation: 'x',
        suggestedAction: 'y',
      },
    };
    expect(routingDecisionV2Schema.safeParse(bad).success).toBe(false);
  });

  it('accepts noExecutionModelIssue with valid code', () => {
    const ok = {
      ...baseValid,
      selectedProfileId: null,
      selectedProvider: null,
      selectedModel: null,
      runtimeType: 'UNKNOWN' as const,
      confidence: 0,
      noExecutionModelIssue: {
        code: 'NO_HEALTHY_EXECUTION_MODEL',
        explanation: 'no models',
        suggestedAction: 'install one',
      },
    };
    expect(routingDecisionV2Schema.safeParse(ok).success).toBe(true);
  });
});
