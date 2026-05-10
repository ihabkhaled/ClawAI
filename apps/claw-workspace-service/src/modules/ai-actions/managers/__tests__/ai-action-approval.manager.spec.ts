import { AiActionPolicyKind } from '../../../../common/enums/ai-action-policy-kind.enum';
import { AiActionQueueStatus } from '../../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { AiActionApprovalManager } from '../ai-action-approval.manager';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
});

describe('AiActionApprovalManager', () => {
  const makeRiskScorer = (score: number, label: AiActionRiskLabel): { assess: jest.Mock } => ({
    assess: jest.fn().mockReturnValue({ riskScore: score, riskLabel: label, reasons: [] }),
  });

  const decisionKindMap: Record<
    'AUTO_APPROVE' | 'PENDING_APPROVAL' | 'DENIED',
    AiActionPolicyKind
  > = {
    AUTO_APPROVE: AiActionPolicyKind.AUTO_APPROVE,
    DENIED: AiActionPolicyKind.DENY,
    PENDING_APPROVAL: AiActionPolicyKind.ALLOW,
  };

  const makeMatcher = (
    decision: 'AUTO_APPROVE' | 'PENDING_APPROVAL' | 'DENIED',
    policyName: string | null = null,
  ): { match: jest.Mock } => {
    const kind = decisionKindMap[decision];
    const matchedPolicy =
      policyName === null
        ? null
        : {
            id: 'p1',
            name: policyName,
            kind,
            riskMaxLabel: AiActionRiskLabel.LOW,
            riskMaxScore: 30,
            priority: 400,
            providerRegex: '.*',
            actionKindRegex: '.*',
            requireReason: false,
            isActive: true,
            isSystemDefault: true,
            description: null,
            createdBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
    return {
      match: jest.fn().mockResolvedValue({
        matchedPolicy,
        effectiveKind: kind,
        decision,
      }),
    };
  };

  const makeQueueRepo = (): { create: jest.Mock } => ({
    create: jest.fn().mockImplementation(async (input: { status: AiActionQueueStatus }) => ({
      id: 'q1',
      ...input,
      matchedPolicyId: 'p1',
      matchedPolicyName: 'test',
    })),
  });

  const makeRabbit = (): { publish: jest.Mock } => ({
    publish: jest.fn().mockImplementation(async () => {}),
  });

  const makePrefRepo = (
    pref: {
      isEnabled: boolean;
      autoApproveBelowRiskScore: number | null;
      perDayBudget?: number | null;
      providers?: string[];
    } | null = null,
    todayCount = 0,
  ): { findOne: jest.Mock; countTodayForBudget: jest.Mock } => ({
    findOne: jest.fn().mockResolvedValue(
      pref === null
        ? null
        : {
            ...pref,
            perDayBudget: pref.perDayBudget ?? null,
            providers: pref.providers ?? [],
          },
    ),
    countTodayForBudget: jest.fn().mockResolvedValue(todayCount),
  });

  const baseInput = {
    userId: 'u1',
    connectorId: 'c1',
    actionKind: 'SUMMARIZE',
    provider: null,
    draftPayload: { body: 'hello world' },
  };

  it('enqueues AUTO_APPROVED status when policy matches AUTO_APPROVE', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      queueRepo as any,
      makePrefRepo() as any,
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    expect(queueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: AiActionQueueStatus.AUTO_APPROVED, expiresAt: null }),
    );
  });

  it('enqueues PENDING_APPROVAL with future expiresAt by default', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      makeMatcher('PENDING_APPROVAL', 'allow-default') as any,
      queueRepo as any,
      makePrefRepo() as any,
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.PENDING_APPROVAL);
    const callArg = queueRepo.create.mock.calls[0]?.[0] as { expiresAt: Date };
    expect(callArg.expiresAt).toBeInstanceOf(Date);
    expect(callArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('enqueues DENIED status when policy denies', async () => {
    const queueRepo = makeQueueRepo();
    const rabbit = makeRabbit();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(95, AiActionRiskLabel.CRITICAL) as any,
      makeMatcher('DENIED', 'deny-pii') as any,
      queueRepo as any,
      makePrefRepo() as any,
      rabbit as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.DENIED);
    expect(queueRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: AiActionQueueStatus.DENIED }),
    );
    // Allow time for the void publish() to schedule
    await new Promise((r) => setImmediate(r));
    const patterns = rabbit.publish.mock.calls.map((c) => c[0]);
    expect(patterns).toContain('ai_action.suggestion_created');
    expect(patterns).toContain('ai_action.denied');
  });

  it('publishes pending_approval event on PENDING status', async () => {
    const rabbit = makeRabbit();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      makeMatcher('PENDING_APPROVAL', null) as any,
      makeQueueRepo() as any,
      makePrefRepo() as any,
      rabbit as any,
    );
    await manager.enqueueSuggestion(baseInput);
    await new Promise((r) => setImmediate(r));
    const patterns = rabbit.publish.mock.calls.map((c) => c[0]);
    expect(patterns).toContain('ai_action.pending_approval');
  });

  it('user-pref disabled forces DENIED even when policy allows AUTO_APPROVE', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      queueRepo as any,
      makePrefRepo({ isEnabled: false, autoApproveBelowRiskScore: 100 }) as any,
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.DENIED);
  });

  it('user threshold below risk downgrades AUTO_APPROVED to PENDING_APPROVAL', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      queueRepo as any,
      makePrefRepo({ isEnabled: true, autoApproveBelowRiskScore: 30 }) as any,
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.PENDING_APPROVAL);
  });

  it('policy DENIED is preserved regardless of user preference', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      makeRiskScorer(95, AiActionRiskLabel.CRITICAL) as any,
      makeMatcher('DENIED', 'deny-pii') as any,
      queueRepo as any,
      makePrefRepo({ isEnabled: true, autoApproveBelowRiskScore: 100 }) as any,
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.DENIED);
  });

  // Stream 12.6 — per-user/day budget cap
  describe('per-user perDayBudget cap (12.6)', () => {
    it('enqueues normally when today count < budget', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo(
          { isEnabled: true, autoApproveBelowRiskScore: 50, perDayBudget: 10 },
          3,
        ) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion(baseInput);
      expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    });

    it('DENIES when today count == budget', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo({ isEnabled: true, autoApproveBelowRiskScore: 50, perDayBudget: 5 }, 5) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion(baseInput);
      expect(result.status).toBe(AiActionQueueStatus.DENIED);
    });

    it('DENIES when today count > budget', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('PENDING_APPROVAL', null) as any,
        makeQueueRepo() as any,
        makePrefRepo(
          { isEnabled: true, autoApproveBelowRiskScore: null, perDayBudget: 5 },
          9,
        ) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion(baseInput);
      expect(result.status).toBe(AiActionQueueStatus.DENIED);
    });

    it('budget=null means unbounded — does not deny', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo(
          { isEnabled: true, autoApproveBelowRiskScore: 50, perDayBudget: null },
          9999,
        ) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion(baseInput);
      expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    });
  });

  // Stream 32.4 — per-provider runtime kill switch
  describe('per-provider kill switch (32.4)', () => {
    it('passes when provider is in user allow-list', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo({
          isEnabled: true,
          autoApproveBelowRiskScore: 50,
          providers: ['GITHUB', 'GMAIL'],
        }) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion({
        ...baseInput,
        provider: WorkspaceProvider.GITHUB,
      });
      expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    });

    it('DENIES when provider is NOT in user allow-list', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo({
          isEnabled: true,
          autoApproveBelowRiskScore: 50,
          providers: ['GITHUB'],
        }) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion({
        ...baseInput,
        provider: WorkspaceProvider.JIRA,
      });
      expect(result.status).toBe(AiActionQueueStatus.DENIED);
    });

    it('null provider always passes (per-provider gate is provider-scoped only)', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo({
          isEnabled: true,
          autoApproveBelowRiskScore: 50,
          providers: ['GITHUB'],
        }) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion({ ...baseInput, provider: null });
      expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    });

    it('persists rejectionReason=PROVIDER_DISABLED when denying on provider mismatch', async () => {
      const queueRepo = makeQueueRepo();
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        queueRepo as any,
        makePrefRepo({
          isEnabled: true,
          autoApproveBelowRiskScore: 50,
          providers: ['GITHUB'],
        }) as any,
        makeRabbit() as any,
      );
      await manager.enqueueSuggestion({ ...baseInput, provider: WorkspaceProvider.JIRA });
      const row = queueRepo.create.mock.calls[0]?.[0] as { rejectionReason: string };
      expect(row.rejectionReason).toBe('PROVIDER_DISABLED');
    });

    it('empty providers[] means unrestricted', async () => {
      const manager = new AiActionApprovalManager(
        makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
        makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
        makeQueueRepo() as any,
        makePrefRepo({
          isEnabled: true,
          autoApproveBelowRiskScore: 50,
          providers: [],
        }) as any,
        makeRabbit() as any,
      );
      const result = await manager.enqueueSuggestion({
        ...baseInput,
        provider: WorkspaceProvider.JIRA,
      });
      expect(result.status).toBe(AiActionQueueStatus.AUTO_APPROVED);
    });
  });
});
