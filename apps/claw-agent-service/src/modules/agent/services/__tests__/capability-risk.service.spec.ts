import { CapabilityBlastRadius } from '../../../../common/enums/capability-blast-radius.enum';
import { CapabilityClass } from '../../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../../common/enums/capability-invocation-status.enum';
import { CapabilityOperation } from '../../../../common/enums/capability-operation.enum';
import { CapabilityReversibility } from '../../../../common/enums/capability-reversibility.enum';
import { PolicyKind } from '../../../../common/enums/policy-kind.enum';
import { RiskLabel } from '../../../../common/enums/risk-label.enum';
import { CapabilityRiskService } from '../capability-risk.service';
import type { PolicyRepository } from '../../repositories/policy.repository';
import type { AccessPolicy } from '../../../../generated/prisma';
import type { RiskAssessmentInput } from '../../types/capability.types';

type AccessPolicyLike = {
  id: string;
  name: string;
  kind: PolicyKind;
  riskScore: number;
  priority: number;
  pattern?: string;
  scope?: string | null;
  riskLabel?: RiskLabel;
  description?: string | null;
  isActive?: boolean;
  orgId?: string | null;
  capabilityClass?: unknown;
  capabilityOperation?: unknown;
  targetMatcherJson?: unknown;
  autoApproveMaxRiskScore?: number | null;
  requireReason?: boolean;
  isSystemDefault?: boolean;
};

function fakePolicy(overrides: AccessPolicyLike): AccessPolicy {
  const base = {
    id: overrides.id,
    name: overrides.name,
    kind: overrides.kind,
    pattern: overrides.pattern ?? '',
    scope: overrides.scope ?? null,
    riskScore: overrides.riskScore,
    riskLabel: overrides.riskLabel ?? RiskLabel.MEDIUM,
    description: overrides.description ?? null,
    priority: overrides.priority,
    isActive: overrides.isActive ?? true,
    orgId: overrides.orgId ?? null,
    capabilityClass: overrides.capabilityClass ?? null,
    capabilityOperation: overrides.capabilityOperation ?? null,
    targetMatcherJson: overrides.targetMatcherJson ?? null,
    autoApproveMaxRiskScore: overrides.autoApproveMaxRiskScore ?? null,
    requireReason: overrides.requireReason ?? false,
    isSystemDefault: overrides.isSystemDefault ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return base as unknown as AccessPolicy;
}

function fakeRepoWith(policies: AccessPolicy[]): PolicyRepository {
  return {
    findActiveForCapabilityClass: jest.fn().mockResolvedValue(policies),
  } as unknown as PolicyRepository;
}

function fsInput(overrides: Partial<RiskAssessmentInput> = {}): RiskAssessmentInput {
  return {
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.READ,
    targetDescriptor: { path: '/home/user/Documents/qa.txt' },
    payload: {},
    blastRadius: CapabilityBlastRadius.NONE,
    reversibility: CapabilityReversibility.REVERSIBLE,
    userId: 'u1',
    deviceId: 'd1',
    deviceAgeDays: 30,
    userInvocationsThisClassCount: 100,
    ...overrides,
  };
}

describe('CapabilityRiskService.assess', () => {
  it('returns PENDING_APPROVAL when no policies match', async () => {
    const service = new CapabilityRiskService(fakeRepoWith([]));
    const result = await service.assess(fsInput());
    expect(result.status).toBe(CapabilityInvocationStatus.PENDING_APPROVAL);
    expect(result.matchedPolicyId).toBeNull();
    expect(result.riskLabel).toBe(RiskLabel.LOW);
  });

  it('AUTO_APPROVES when an AUTO_APPROVE policy matches and score is under cap', async () => {
    const policy = fakePolicy({
      id: 'p1',
      name: 'auto-approve-fs-read-user-docs-low-risk',
      kind: PolicyKind.AUTO_APPROVE,
      riskScore: 10,
      priority: 100,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: CapabilityOperation.READ as never,
      autoApproveMaxRiskScore: 20,
    });
    const service = new CapabilityRiskService(fakeRepoWith([policy]));
    const result = await service.assess(fsInput());
    expect(result.status).toBe(CapabilityInvocationStatus.AUTO_APPROVED);
    expect(result.matchedPolicyName).toBe('auto-approve-fs-read-user-docs-low-risk');
  });

  it('downgrades AUTO_APPROVE to PENDING when score exceeds cap', async () => {
    const policy = fakePolicy({
      id: 'p1',
      name: 'auto-approve-tight',
      kind: PolicyKind.AUTO_APPROVE,
      riskScore: 5,
      priority: 100,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: CapabilityOperation.READ as never,
      autoApproveMaxRiskScore: 10,
    });
    const service = new CapabilityRiskService(fakeRepoWith([policy]));
    const result = await service.assess(
      fsInput({ blastRadius: CapabilityBlastRadius.SYSTEM_SCOPE }),
    );
    // SYSTEM_SCOPE adds RISK_WEIGHT_BLAST_SYSTEM (20) → score > 10 cap → PENDING
    expect(result.status).toBe(CapabilityInvocationStatus.PENDING_APPROVAL);
  });

  it('DENIES when a DENY policy matches and stops short-circuiting at first DENY', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny',
      name: 'deny-fs-system-paths',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 950,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: null,
      targetMatcherJson: { pathDenyGlob: ['/etc/**'] } as never,
    });
    const allowPolicy = fakePolicy({
      id: 'p-allow',
      name: 'allow-fs-read',
      kind: PolicyKind.ALLOW,
      riskScore: 35,
      priority: 500,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: CapabilityOperation.READ as never,
      targetMatcherJson: null,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy, allowPolicy]));
    const result = await service.assess(
      fsInput({ targetDescriptor: { path: '/etc/passwd' } }),
    );
    expect(result.status).toBe(CapabilityInvocationStatus.DENIED);
    expect(result.matchedPolicyName).toBe('deny-fs-system-paths');
  });

  it('first ALLOW policy in priority order wins when no DENY matches', async () => {
    const policies: AccessPolicy[] = [
      fakePolicy({
        id: 'p-allow-high',
        name: 'allow-priority-500',
        kind: PolicyKind.ALLOW,
        riskScore: 30,
        priority: 500,
        capabilityClass: CapabilityClass.FILESYSTEM as never,
        capabilityOperation: CapabilityOperation.READ as never,
      }),
      fakePolicy({
        id: 'p-allow-low',
        name: 'allow-priority-100',
        kind: PolicyKind.ALLOW,
        riskScore: 20,
        priority: 100,
        capabilityClass: CapabilityClass.FILESYSTEM as never,
        capabilityOperation: CapabilityOperation.READ as never,
      }),
    ];
    const service = new CapabilityRiskService(fakeRepoWith(policies));
    const result = await service.assess(fsInput());
    expect(result.matchedPolicyName).toBe('allow-priority-500');
    expect(result.status).toBe(CapabilityInvocationStatus.PENDING_APPROVAL);
  });

  it('AUTO_APPROVE wins over a higher-priority ALLOW when both target-match', async () => {
    const policies: AccessPolicy[] = [
      fakePolicy({
        id: 'p-allow-high',
        name: 'allow-fs-read-user-dirs',
        kind: PolicyKind.ALLOW,
        riskScore: 35,
        priority: 500,
        capabilityClass: CapabilityClass.FILESYSTEM as never,
        capabilityOperation: CapabilityOperation.READ as never,
      }),
      fakePolicy({
        id: 'p-auto',
        name: 'auto-approve-fs-read-user-docs-low-risk',
        kind: PolicyKind.AUTO_APPROVE,
        riskScore: 10,
        priority: 100,
        capabilityClass: CapabilityClass.FILESYSTEM as never,
        capabilityOperation: CapabilityOperation.READ as never,
        autoApproveMaxRiskScore: 30,
      }),
    ];
    const service = new CapabilityRiskService(fakeRepoWith(policies));
    const result = await service.assess(fsInput());
    expect(result.matchedPolicyName).toBe('auto-approve-fs-read-user-docs-low-risk');
    expect(result.status).toBe(CapabilityInvocationStatus.AUTO_APPROVED);
  });

  it('boosts score for IRREVERSIBLE + SYSTEM_SCOPE blast', async () => {
    const service = new CapabilityRiskService(fakeRepoWith([]));
    const result = await service.assess(
      fsInput({
        blastRadius: CapabilityBlastRadius.SYSTEM_SCOPE,
        reversibility: CapabilityReversibility.IRREVERSIBLE,
      }),
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
    expect(result.riskLabel).not.toBe(RiskLabel.LOW);
    expect(result.reasons).toEqual(expect.arrayContaining(['blast=SYSTEM_SCOPE', 'reversibility=IRREVERSIBLE']));
  });

  it('detects secret patterns in payload and adds risk + reason', async () => {
    const service = new CapabilityRiskService(fakeRepoWith([]));
    const result = await service.assess(
      fsInput({
        payload: { content: 'Use AKIAIOSFODNN7EXAMPLE to upload' },
      }),
    );
    expect(result.reasons).toEqual(expect.arrayContaining(['secret_pattern']));
    expect(result.riskScore).toBeGreaterThanOrEqual(15);
  });

  it('matches deny pathDenyGlob across symlink-like paths', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny-credentials',
      name: 'deny-fs-credentials',
      kind: PolicyKind.DENY,
      riskScore: 95,
      priority: 940,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: null,
      targetMatcherJson: { pathDenyGlob: ['**/.aws/**', '**/credentials*'] } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess(
      fsInput({ targetDescriptor: { path: '/home/user/.aws/credentials' } }),
    );
    expect(result.status).toBe(CapabilityInvocationStatus.DENIED);
  });

  it('skips policies whose targetMatcher does not match', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny',
      name: 'deny-system',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 950,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: null,
      targetMatcherJson: { pathDenyGlob: ['/etc/**'] } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess(
      fsInput({ targetDescriptor: { path: '/home/user/Documents/work.txt' } }),
    );
    expect(result.status).toBe(CapabilityInvocationStatus.PENDING_APPROVAL);
    expect(result.matchedPolicyId).toBeNull();
  });

  it('classifies LOW score as RiskLabel.LOW', async () => {
    const service = new CapabilityRiskService(fakeRepoWith([]));
    const result = await service.assess(fsInput());
    expect(result.riskScore).toBeLessThanOrEqual(24);
    expect(result.riskLabel).toBe(RiskLabel.LOW);
  });

  it('classifies CRITICAL score as RiskLabel.CRITICAL', async () => {
    const service = new CapabilityRiskService(fakeRepoWith([]));
    const result = await service.assess(
      fsInput({
        blastRadius: CapabilityBlastRadius.SYSTEM_SCOPE,
        reversibility: CapabilityReversibility.IRREVERSIBLE,
        payload: { content: 'AKIAIOSFODNN7EXAMPLE -----BEGIN RSA PRIVATE KEY-----' },
        deviceAgeDays: 1,
        userInvocationsThisClassCount: 0,
      }),
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.riskLabel).toBe(RiskLabel.CRITICAL);
  });

  it('matches process kill with pidRange matcher', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny-pid1',
      name: 'deny-process-kill-pid-1',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 990,
      capabilityClass: CapabilityClass.PROCESS as never,
      capabilityOperation: CapabilityOperation.KILL as never,
      targetMatcherJson: { pidRange: [1, 99] } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess({
      capabilityClass: CapabilityClass.PROCESS,
      capabilityOperation: CapabilityOperation.KILL,
      targetDescriptor: { pid: 1 },
      payload: { signal: 'SIGTERM' },
      blastRadius: CapabilityBlastRadius.SYSTEM_SCOPE,
      reversibility: CapabilityReversibility.IRREVERSIBLE,
      userId: 'u1',
      deviceId: 'd1',
      deviceAgeDays: 30,
      userInvocationsThisClassCount: 100,
    });
    expect(result.status).toBe(CapabilityInvocationStatus.DENIED);
  });

  it('matches process kill against pidRange for high PID does NOT match deny [1,99]', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny-pid1',
      name: 'deny-process-kill-pid-1',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 990,
      capabilityClass: CapabilityClass.PROCESS as never,
      capabilityOperation: CapabilityOperation.KILL as never,
      targetMatcherJson: { pidRange: [1, 99] } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess({
      capabilityClass: CapabilityClass.PROCESS,
      capabilityOperation: CapabilityOperation.KILL,
      targetDescriptor: { pid: 12345 },
      payload: { signal: 'SIGTERM' },
      blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
      reversibility: CapabilityReversibility.IRREVERSIBLE,
      userId: 'u1',
      deviceId: 'd1',
      deviceAgeDays: 30,
      userInvocationsThisClassCount: 100,
    });
    expect(result.status).not.toBe(CapabilityInvocationStatus.DENIED);
  });

  it('matches browser by urlGlob deny', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny-bank',
      name: 'deny-browser-banking',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 970,
      capabilityClass: CapabilityClass.BROWSER as never,
      capabilityOperation: null,
      targetMatcherJson: { urlDenyGlob: ['**/accounts.google.com/**'] } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess({
      capabilityClass: CapabilityClass.BROWSER,
      capabilityOperation: CapabilityOperation.OPEN,
      targetDescriptor: { url: 'https://accounts.google.com/signin' },
      payload: {},
      blastRadius: CapabilityBlastRadius.NONE,
      reversibility: CapabilityReversibility.REVERSIBLE,
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(result.status).toBe(CapabilityInvocationStatus.DENIED);
  });

  it('skips capability class mismatch even if operation matches', async () => {
    const denyPolicy = fakePolicy({
      id: 'p-deny-fs',
      name: 'deny-fs-system',
      kind: PolicyKind.DENY,
      riskScore: 100,
      priority: 950,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: null,
      targetMatcherJson: { pathDenyGlob: ['/etc/**'] } as never,
    });
    // The policy is FS-class but the input is PROCESS class — repo
    // (mocked) returns the policy anyway; the service should reject
    // it via class-mismatch check.
    const service = new CapabilityRiskService(fakeRepoWith([denyPolicy]));
    const result = await service.assess({
      capabilityClass: CapabilityClass.PROCESS,
      capabilityOperation: CapabilityOperation.KILL,
      targetDescriptor: { pid: 12345 },
      payload: {},
      blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
      reversibility: CapabilityReversibility.IRREVERSIBLE,
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(result.status).not.toBe(CapabilityInvocationStatus.DENIED);
  });

  it('payloadFlag matcher fires only when flag is truthy', async () => {
    const policy = fakePolicy({
      id: 'p-perm-delete',
      name: 'always-pending-fs-permanent-delete',
      kind: PolicyKind.ALLOW,
      riskScore: 70,
      priority: 800,
      capabilityClass: CapabilityClass.FILESYSTEM as never,
      capabilityOperation: CapabilityOperation.DELETE as never,
      targetMatcherJson: { payloadFlag: 'permanent' } as never,
    });
    const service = new CapabilityRiskService(fakeRepoWith([policy]));
    const flagged = await service.assess(
      fsInput({
        capabilityOperation: CapabilityOperation.DELETE,
        payload: { permanent: true },
        blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
        reversibility: CapabilityReversibility.IRREVERSIBLE,
      }),
    );
    expect(flagged.matchedPolicyName).toBe('always-pending-fs-permanent-delete');
    const unflagged = await service.assess(
      fsInput({
        capabilityOperation: CapabilityOperation.DELETE,
        payload: {},
        blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
        reversibility: CapabilityReversibility.COMPENSATABLE,
      }),
    );
    expect(unflagged.matchedPolicyName).toBeNull();
  });
});
