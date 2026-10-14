import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { HostRulePolicyManager } from '../../host-rules/managers/host-rule-policy.manager';
import { AdminServerPresenterManager } from '../managers/admin-server-presenter.manager';
import { AdminAuditService } from '../services/admin-audit.service';
import { ServerApprovalService } from '../services/server-approval.service';
import { type PendingServerRecord } from '../types/curation.types';
import { ADMIN, errorCodeOf } from './curation-fixtures';

const SERVER_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';

function pending(overrides: Partial<PendingServerRecord> = {}): PendingServerRecord {
  return {
    id: SERVER_ID,
    slug: 'mcp3f2b8f0e9d3c',
    name: 'My tracker',
    ownerUserId: 'user-owner',
    url: 'https://mcp.tracker.example.com/v1/mcp?token=SECRET',
    urlHost: 'mcp.tracker.example.com',
    authKind: AuthKind.API_KEY,
    hasCredential: true,
    status: ServerState.PENDING_APPROVAL,
    serverInfo: { name: 'Tracker', version: '1' },
    toolsHash: 'hash',
    createdAt: new Date('2026-10-15T08:00:00.000Z'),
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
    tools: [
      { name: 'list_issues', description: 'List issues.', riskLevel: RiskLevel.READ },
      { name: 'create_issue', description: 'Create an issue.', riskLevel: RiskLevel.WRITE },
    ],
    ...overrides,
  };
}

function build(initial: PendingServerRecord | null = pending(), rules: unknown[] = []) {
  let current = initial;
  const repository = {
    findByStatus: vi
      .fn()
      .mockImplementation(() => Promise.resolve(current === null ? [] : [current])),
    findById: vi.fn().mockImplementation(() => Promise.resolve(current)),
    decide: vi
      .fn()
      .mockImplementation(
        (
          _id: string,
          from: ServerState[],
          to: ServerState,
          adminId: string,
          reason: string | null,
        ) => {
          if (current === null || !from.includes(current.status)) return Promise.resolve(false);
          current = {
            ...current,
            status: to,
            decidedBy: adminId,
            decidedAt: new Date('2026-10-15T09:00:00.000Z'),
            decisionReason: reason,
          };
          return Promise.resolve(true);
        },
      ),
  };
  const policy = new HostRulePolicyManager({ findAll: vi.fn().mockResolvedValue(rules) } as never);
  const notices = {
    approved: vi.fn().mockResolvedValue(undefined),
    rejected: vi.fn().mockResolvedValue(undefined),
  };
  const auditRepository = { write: vi.fn().mockResolvedValue(undefined) };
  const service = new ServerApprovalService(
    repository as never,
    new AdminServerPresenterManager(),
    policy,
    notices as never,
    new AdminAuditService(auditRepository as never),
  );
  return { service, repository, notices, auditRepository, state: () => current };
}

describe('admin approval queue: ServerApprovalService', () => {
  it('lists a pending server with submitter, host, tools, highest risk, and no query string', async () => {
    const { service } = build();

    const [view] = await service.list(ServerState.PENDING_APPROVAL);

    expect(view).toMatchObject({
      id: SERVER_ID,
      submitterUserId: 'user-owner',
      urlHost: 'mcp.tracker.example.com',
      urlPath: '/v1/mcp',
      highestRisk: RiskLevel.WRITE,
      toolCount: 2,
      hasCredential: true,
      serverName: 'Tracker',
    });
    expect(JSON.stringify(view)).not.toContain('SECRET');
  });

  it('approves a pending server, audits it, and tells the submitter', async () => {
    const { service, notices, auditRepository, state } = build();

    const view = await service.approve(ADMIN, SERVER_ID);

    expect(view.status).toBe(ServerState.APPROVED);
    expect(state()).toMatchObject({ status: ServerState.APPROVED, decidedBy: ADMIN });
    expect(notices.approved).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: 'user-owner', serverName: 'My tracker' }),
    );
    expect(auditRepository.write.mock.calls[0]?.[0]).toMatchObject({
      action: 'SERVER_APPROVED',
      actorId: ADMIN,
      targetId: SERVER_ID,
    });
  });

  it('rejects with a reason, stores it, audits it, and sends the reason to the submitter', async () => {
    const { service, notices, auditRepository, state } = build();

    const view = await service.reject(ADMIN, SERVER_ID, 'We do not allow this vendor.');

    expect(view).toMatchObject({
      status: ServerState.REJECTED,
      decisionReason: 'We do not allow this vendor.',
    });
    expect(state()?.status).toBe(ServerState.REJECTED);
    expect(notices.rejected).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'We do not allow this vendor.' }),
    );
    expect(auditRepository.write.mock.calls[0]?.[0]).toMatchObject({ action: 'SERVER_REJECTED' });
  });

  it.each([
    ServerState.APPROVED,
    ServerState.REJECTED,
    ServerState.DISABLED,
    ServerState.NEEDS_REVIEW,
  ])('will not approve a server that is %s (409)', async (status) => {
    const { service, notices, auditRepository } = build(pending({ status }));

    expect(await errorCodeOf(service.approve(ADMIN, SERVER_ID))).toBe(
      CurationErrorCode.SERVER_NOT_PENDING,
    );
    expect(notices.approved).not.toHaveBeenCalled();
    expect(auditRepository.write).not.toHaveBeenCalled();
  });

  it.each([ServerState.PENDING_APPROVAL, ServerState.NEEDS_REVIEW, ServerState.APPROVED])(
    'can reject a server that is %s',
    async (status) => {
      const { service } = build(pending({ status }));

      expect((await service.reject(ADMIN, SERVER_ID, 'No.')).status).toBe(ServerState.REJECTED);
    },
  );

  it.each([ServerState.REJECTED, ServerState.DISABLED, ServerState.UNREACHABLE])(
    'will not reject a server that is already %s (409)',
    async (status) => {
      const { service } = build(pending({ status }));

      expect(await errorCodeOf(service.reject(ADMIN, SERVER_ID, 'No.'))).toBe(
        CurationErrorCode.SERVER_NOT_PENDING,
      );
    },
  );

  it('answers 409 when another admin decided between the read and the write', async () => {
    const { service, repository, notices } = build();
    repository.decide.mockResolvedValueOnce(false);

    expect(await errorCodeOf(service.approve(ADMIN, SERVER_ID))).toBe(
      CurationErrorCode.SERVER_NOT_PENDING,
    );
    expect(notices.approved).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown server', async () => {
    const { service } = build(null);

    expect(await errorCodeOf(service.approve(ADMIN, SERVER_ID))).toBe(CurationErrorCode.NOT_FOUND);
    expect(await errorCodeOf(service.reject(ADMIN, SERVER_ID, 'No.'))).toBe(
      CurationErrorCode.NOT_FOUND,
    );
  });

  it('will not approve a host an admin deny rule covers (403) and leaves it pending', async () => {
    const rule = {
      id: 'r1',
      kind: HostRuleKind.DENY,
      match: HostRuleMatch.HOST,
      pattern: 'example.com',
      note: null,
      createdBy: ADMIN,
      createdAt: new Date(),
    };
    const { service, state } = build(pending(), [rule]);

    expect(await errorCodeOf(service.approve(ADMIN, SERVER_ID))).toBe(
      CurationErrorCode.HOST_DENIED,
    );
    expect(state()?.status).toBe(ServerState.PENDING_APPROVAL);
  });
});
