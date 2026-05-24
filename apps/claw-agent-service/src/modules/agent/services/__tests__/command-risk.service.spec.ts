import { CapabilityInvocationStatus } from '../../../../common/enums/capability-invocation-status.enum';
import { PolicyKind } from '../../../../common/enums/policy-kind.enum';
import { RiskLabel } from '../../../../common/enums/risk-label.enum';
import { CapabilityDualWriteMetricsService } from '../capability-dual-write-metrics.service';
import { CapabilityRiskService } from '../capability-risk.service';
import { CommandRiskService } from '../command-risk.service';
import type { AccessPolicy } from '../../../../generated/prisma';
import type { PolicyRepository } from '../../repositories/policy.repository';

/**
 * V2 Stream 01 — unit tests for CommandRiskService focused on the
 * dual-write call into CapabilityRiskService and the metrics
 * recording. These tests do NOT re-cover the legacy regex/heuristic
 * scoring path — that is covered by the live qa/test-agent-service.sh
 * suite and the heuristic constants are not changing in V2 Stream 01.
 */

function fakePolicy(overrides: Partial<AccessPolicy> = {}): AccessPolicy {
  return {
    id: 'p1',
    name: 'test policy',
    description: null,
    pattern: '^sudo',
    kind: PolicyKind.DENY,
    riskScore: 60,
    riskLabel: RiskLabel.HIGH,
    priority: 100,
    isActive: true,
    capabilityClass: null,
    capabilityOperation: null,
    targetMatcherJson: null,
    autoApproveMaxRiskScore: null,
    requireReason: false,
    isSystemDefault: true,
    orgId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AccessPolicy;
}

function fakePolicyRepo(policies: AccessPolicy[]): jest.Mocked<PolicyRepository> {
  return {
    findActive: jest.fn().mockResolvedValue(policies),
    findActiveForCapabilityClass: jest.fn(),
    findOrgIdsForUser: jest.fn(),
  } as unknown as jest.Mocked<PolicyRepository>;
}

function fakeCapRiskService(
  result: Partial<{
    status: CapabilityInvocationStatus;
    matchedPolicyName: string | null;
    riskScore: number;
    riskLabel: RiskLabel;
  }> = {},
): jest.Mocked<CapabilityRiskService> {
  return {
    assess: jest.fn().mockResolvedValue({
      status: result.status ?? CapabilityInvocationStatus.PENDING_APPROVAL,
      matchedPolicyName: result.matchedPolicyName ?? null,
      matchedPolicyId: null,
      matchedPolicyKind: null,
      riskScore: result.riskScore ?? 10,
      riskLabel: result.riskLabel ?? RiskLabel.LOW,
      reasons: [],
    }),
  } as unknown as jest.Mocked<CapabilityRiskService>;
}

describe('CommandRiskService', () => {
  beforeEach(() => {
    // Default: dual-write ON
    delete process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE;
  });

  it('returns legacy assessment unchanged regardless of dual-write outcome', async () => {
    const repo = fakePolicyRepo([fakePolicy()]);
    const capRisk = fakeCapRiskService();
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    const result = await svc.assess('echo hello');

    expect(result.blockedByPolicy).toBe(false);
    expect(result.autoApproved).toBe(false);
    // wait one tick for fire-and-forget dual-write to settle
    await new Promise((r) => setImmediate(r));
    expect(capRisk.assess).toHaveBeenCalledTimes(1);
  });

  it('records a matching dual-write decision (legacy non-blocked vs capability PENDING_APPROVAL)', async () => {
    const repo = fakePolicyRepo([]);
    const capRisk = fakeCapRiskService({ status: CapabilityInvocationStatus.PENDING_APPROVAL });
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    await svc.assess('ls -la');
    await new Promise((r) => setImmediate(r));

    const status = metrics.status();
    expect(status.totalDecisions).toBe(1);
    expect(status.divergentDecisions).toBe(0);
  });

  it('records a divergent dual-write decision (legacy DENY vs capability PENDING_APPROVAL)', async () => {
    const denyPolicy = fakePolicy({ pattern: '^sudo', kind: PolicyKind.DENY });
    const repo = fakePolicyRepo([denyPolicy]);
    const capRisk = fakeCapRiskService({
      status: CapabilityInvocationStatus.PENDING_APPROVAL,
      matchedPolicyName: 'Default approval',
    });
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    const result = await svc.assess('sudo rm -rf /');
    await new Promise((r) => setImmediate(r));

    expect(result.blockedByPolicy).toBe(true);
    const status = metrics.status();
    expect(status.totalDecisions).toBe(1);
    expect(status.divergentDecisions).toBe(1);
    expect(status.recentDivergences[0]).toMatchObject({
      legacyDecision: CapabilityInvocationStatus.DENIED,
      capabilityDecision: CapabilityInvocationStatus.PENDING_APPROVAL,
    });
  });

  it('records a capability-path error as a divergence with errorMessage', async () => {
    const repo = fakePolicyRepo([]);
    const capRisk = {
      assess: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as jest.Mocked<CapabilityRiskService>;
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    const result = await svc.assess('echo will-not-block');
    // legacy result is still returned even when capability path errored
    expect(result.blockedByPolicy).toBe(false);
    await new Promise((r) => setImmediate(r));

    const status = metrics.status();
    expect(status.divergentDecisions).toBe(1);
    expect(status.recentDivergences[0]).toMatchObject({
      legacyDecision: 'OK',
      capabilityDecision: 'ERROR',
      errorMessage: 'boom',
    });
  });

  it('does NOT call CapabilityRiskService when dual-write flag is false', async () => {
    process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE = 'false';
    const repo = fakePolicyRepo([]);
    const capRisk = fakeCapRiskService();
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    await svc.assess('echo hello');
    await new Promise((r) => setImmediate(r));

    expect(capRisk.assess).not.toHaveBeenCalled();
    expect(metrics.status().totalDecisions).toBe(0);
  });

  it('respects empty/unset env as default-on (dual-write enabled)', async () => {
    delete process.env.CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE;
    const repo = fakePolicyRepo([]);
    const capRisk = fakeCapRiskService();
    const metrics = new CapabilityDualWriteMetricsService();
    const svc = new CommandRiskService(repo, capRisk, metrics);

    await svc.assess('echo hello');
    await new Promise((r) => setImmediate(r));
    expect(capRisk.assess).toHaveBeenCalledTimes(1);
  });
});
