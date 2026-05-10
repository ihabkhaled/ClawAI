import { AiActionPolicyKind } from '../../../../common/enums/ai-action-policy-kind.enum';
import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import { AiActionPolicyMatcherManager } from '../ai-action-policy-matcher.manager';

const fixedDate = new Date('2026-04-26T00:00:00Z');

const makePolicy = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'p1',
  name: overrides['name'] ?? 'test-policy',
  kind: overrides['kind'] ?? AiActionPolicyKind.ALLOW,
  description: null,
  providerRegex: overrides['providerRegex'] ?? '.*',
  actionKindRegex: overrides['actionKindRegex'] ?? '.*',
  riskMaxLabel: overrides['riskMaxLabel'] ?? AiActionRiskLabel.LOW,
  riskMaxScore: overrides['riskMaxScore'] ?? 30,
  priority: overrides['priority'] ?? 0,
  requireReason: false,
  isActive: true,
  isSystemDefault: true,
  createdBy: null,
  createdAt: fixedDate,
  updatedAt: fixedDate,
});

describe('AiActionPolicyMatcherManager', () => {
  const makeRepo = (policies: unknown[]): { findActive: jest.Mock } => ({
    findActive: jest.fn().mockResolvedValue(policies),
  });

  it('returns DENIED when DENY policy matches and risk meets the deny threshold', async () => {
    const repo: any = makeRepo([makePolicy({ kind: AiActionPolicyKind.DENY, name: 'deny-pii' })]);

    const manager = new AiActionPolicyMatcherManager(repo as any);
    const result = await manager.match({
      provider: 'GMAIL',
      actionKind: 'DRAFT',
      // Default `riskMaxScore: 30` (set in makePolicy override). 50 ≥ 30 → fires.
      risk: { riskScore: 50, riskLabel: AiActionRiskLabel.MEDIUM, reasons: [] },
    });
    expect(result.decision).toBe('DENIED');
    expect(result.matchedPolicy?.name).toBe('deny-pii');
  });

  it('returns AUTO_APPROVE when AUTO_APPROVE policy matches and risk within threshold', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        name: 'auto-summarize',
        actionKindRegex: '^SUMMARIZE$',
        priority: 400,
      }),
      makePolicy({ kind: AiActionPolicyKind.ALLOW, name: 'fallback', priority: 100 }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'JIRA',
      actionKind: 'SUMMARIZE',
      risk: { riskScore: 20, riskLabel: AiActionRiskLabel.LOW, reasons: [] },
    });
    expect(result.decision).toBe('AUTO_APPROVE');
    expect(result.matchedPolicy?.name).toBe('auto-summarize');
  });

  it('falls through to ALLOW when AUTO_APPROVE risk threshold exceeded', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        name: 'auto-summarize',
        actionKindRegex: '^SUMMARIZE$',
        riskMaxLabel: AiActionRiskLabel.LOW,
        riskMaxScore: 30,
        priority: 400,
      }),
      makePolicy({ kind: AiActionPolicyKind.ALLOW, name: 'fallback', priority: 100 }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'JIRA',
      actionKind: 'SUMMARIZE',
      risk: { riskScore: 70, riskLabel: AiActionRiskLabel.HIGH, reasons: [] },
    });
    expect(result.decision).toBe('PENDING_APPROVAL');
    expect(result.matchedPolicy?.name).toBe('fallback');
  });

  it('returns null match when no policies apply', async () => {
    const manager = new AiActionPolicyMatcherManager(makeRepo([]) as any);
    const result = await manager.match({
      provider: 'GMAIL',
      actionKind: 'DRAFT',
      risk: { riskScore: 10, riskLabel: AiActionRiskLabel.LOW, reasons: [] },
    });
    expect(result.decision).toBe('PENDING_APPROVAL');
    expect(result.matchedPolicy).toBeNull();
  });

  it('rejects mismatched provider regex', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        providerRegex: '^GITHUB$',
      }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'JIRA',
      actionKind: 'SUMMARIZE',
      risk: { riskScore: 10, riskLabel: AiActionRiskLabel.LOW, reasons: [] },
    });
    expect(result.decision).toBe('PENDING_APPROVAL');
    expect(result.matchedPolicy).toBeNull();
  });

  it('DENY wins over AUTO_APPROVE when risk meets the deny threshold', async () => {
    const policies = [
      makePolicy({ kind: AiActionPolicyKind.AUTO_APPROVE, name: 'auto', priority: 1000 }),
      makePolicy({ kind: AiActionPolicyKind.DENY, name: 'deny', priority: 100 }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'GMAIL',
      actionKind: 'DRAFT',
      // Risk is HIGH/95, default deny threshold is LOW/30 — deny fires.
      risk: { riskScore: 95, riskLabel: AiActionRiskLabel.HIGH, reasons: [] },
    });
    expect(result.decision).toBe('DENIED');
  });

  it('DENY at higher priority short-circuits AUTO_APPROVE when risk meets threshold', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.DENY,
        name: 'deny',
        priority: 1000,
      }),
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        name: 'auto',
        priority: 500,
      }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'GMAIL',
      actionKind: 'DRAFT',
      risk: { riskScore: 95, riskLabel: AiActionRiskLabel.HIGH, reasons: [] },
    });
    expect(result.decision).toBe('DENIED');
  });

  // Phase E close-out (10.2) — broad DENY rules with `.*/.*` no longer block
  // every action; they fire only when the risk scorer has flagged the payload
  // at the deny threshold or above.
  it('broad DENY (.*/.* providerRegex/actionKindRegex) does NOT fire on low-risk content', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.DENY,
        name: 'deny-pii-leakage',
        providerRegex: '.*',
        actionKindRegex: '.*',
        riskMaxLabel: AiActionRiskLabel.CRITICAL,
        riskMaxScore: 100,
        priority: 1000,
      }),
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        name: 'auto-summarize',
        actionKindRegex: '^SUMMARIZE$',
        priority: 400,
      }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'JIRA',
      actionKind: 'SUMMARIZE',
      risk: { riskScore: 10, riskLabel: AiActionRiskLabel.LOW, reasons: [] },
    });
    expect(result.decision).toBe('AUTO_APPROVE');
    expect(result.matchedPolicy?.name).toBe('auto-summarize');
  });

  it('broad DENY DOES fire when risk score reaches its threshold', async () => {
    const policies = [
      makePolicy({
        kind: AiActionPolicyKind.DENY,
        name: 'deny-pii-leakage',
        providerRegex: '.*',
        actionKindRegex: '.*',
        riskMaxLabel: AiActionRiskLabel.CRITICAL,
        riskMaxScore: 100,
        priority: 1000,
      }),
      makePolicy({
        kind: AiActionPolicyKind.AUTO_APPROVE,
        name: 'auto-summarize',
        actionKindRegex: '^SUMMARIZE$',
        priority: 400,
      }),
    ];

    const manager = new AiActionPolicyMatcherManager(makeRepo(policies) as any);
    const result = await manager.match({
      provider: 'JIRA',
      actionKind: 'SUMMARIZE',
      // PII pattern matched → score 100 → deny threshold met.
      risk: { riskScore: 100, riskLabel: AiActionRiskLabel.CRITICAL, reasons: ['aws-key'] },
    });
    expect(result.decision).toBe('DENIED');
    expect(result.matchedPolicy?.name).toBe('deny-pii-leakage');
  });
});
