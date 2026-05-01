import { AiActionPolicyKind } from '../../../../common/enums/ai-action-policy-kind.enum';
import { AiActionQueueStatus } from '../../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import { AiActionApprovalManager } from '../ai-action-approval.manager';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
});

describe('AiActionApprovalManager', () => {
  const makeRiskScorer = (
    score: number,
    label: AiActionRiskLabel,
  ): { assess: jest.Mock } => ({
    assess: jest.fn().mockReturnValue({ riskScore: score, riskLabel: label, reasons: [] }),
  });

  const decisionKindMap: Record<'AUTO_APPROVE' | 'PENDING_APPROVAL' | 'DENIED', AiActionPolicyKind> = {
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
    publish: jest.fn().mockResolvedValue(undefined),
  });

  const makePrefRepo = (
    pref: {
      isEnabled: boolean;
      autoApproveBelowRiskScore: number | null;
    } | null = null,
  ): { findOne: jest.Mock } => ({
    findOne: jest.fn().mockResolvedValue(pref),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('PENDING_APPROVAL', 'allow-default') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(95, AiActionRiskLabel.CRITICAL) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('DENIED', 'deny-pii') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('PENDING_APPROVAL', null) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeQueueRepo() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(10, AiActionRiskLabel.LOW) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo({ isEnabled: false, autoApproveBelowRiskScore: 100 }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.DENIED);
  });

  it('user threshold below risk downgrades AUTO_APPROVED to PENDING_APPROVAL', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(50, AiActionRiskLabel.MEDIUM) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('AUTO_APPROVE', 'auto-summarize') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo({ isEnabled: true, autoApproveBelowRiskScore: 30 }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.PENDING_APPROVAL);
  });

  it('policy DENIED is preserved regardless of user preference', async () => {
    const queueRepo = makeQueueRepo();
    const manager = new AiActionApprovalManager(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRiskScorer(95, AiActionRiskLabel.CRITICAL) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeMatcher('DENIED', 'deny-pii') as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queueRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makePrefRepo({ isEnabled: true, autoApproveBelowRiskScore: 100 }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await manager.enqueueSuggestion(baseInput);
    expect(result.status).toBe(AiActionQueueStatus.DENIED);
  });
});
