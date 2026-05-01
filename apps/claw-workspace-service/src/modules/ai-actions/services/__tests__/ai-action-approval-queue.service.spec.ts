import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AiActionQueueStatus } from '../../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import { AiActionApprovalQueueService } from '../ai-action-approval-queue.service';

const makeRow = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'q1',
  userId: overrides['userId'] ?? 'u1',
  connectorId: 'c1',
  actionKind: 'SUMMARIZE',
  provider: 'JIRA',
  status: overrides['status'] ?? AiActionQueueStatus.PENDING_APPROVAL,
  riskLabel: overrides['riskLabel'] ?? AiActionRiskLabel.LOW,
  riskScore: 20,
  matchedPolicyId: 'p1',
  matchedPolicyName: 'auto',
  draftPayload: { body: 'x' },
  editedPayload: null,
});

describe('AiActionApprovalQueueService', () => {
  const makeRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
    findById: jest.fn(),
    findByIdAndUser: jest.fn(),
    list: jest.fn(),
    updateStatus: jest.fn(),
    findExpired: jest.fn(),
    existsActiveForSourceAndKind: jest.fn(),
    create: jest.fn(),
    ...overrides,
  });

  const makeRabbit = (): { publish: jest.Mock } => ({
    publish: jest.fn().mockResolvedValue(undefined),
  });

  it('approve transitions PENDING → APPROVED', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow()),
      updateStatus: jest.fn().mockResolvedValue(makeRow({ status: AiActionQueueStatus.APPROVED })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await service.approve({ queueId: 'q1', userId: 'u1' });
    expect(result.status).toBe(AiActionQueueStatus.APPROVED);
    expect(repo['updateStatus']).toHaveBeenCalledWith('q1', AiActionQueueStatus.APPROVED);
  });

  it('approve refuses non-pending status', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow({ status: AiActionQueueStatus.EXECUTED })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    await expect(service.approve({ queueId: 'q1', userId: 'u1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('approve refuses different user', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow({ userId: 'someone-else' })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    await expect(service.approve({ queueId: 'q1', userId: 'u1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('approve 404 on missing row', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    await expect(service.approve({ queueId: 'qX', userId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reject HIGH risk requires reason ≥10 chars', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow({ riskLabel: AiActionRiskLabel.HIGH })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    await expect(
      service.reject({ queueId: 'q1', userId: 'u1', reason: 'short' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reject LOW risk works without reason length check enforcement', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow({ riskLabel: AiActionRiskLabel.LOW })),
      updateStatus: jest.fn().mockResolvedValue(makeRow({ status: AiActionQueueStatus.REJECTED })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await service.reject({ queueId: 'q1', userId: 'u1', reason: 'no' });
    expect(result.status).toBe(AiActionQueueStatus.REJECTED);
  });

  it('editAndApprove stores editedPayload and approves', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeRow()),
      updateStatus: jest.fn().mockResolvedValue(makeRow({ status: AiActionQueueStatus.APPROVED })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    await service.editAndApprove({
      queueId: 'q1',
      userId: 'u1',
      editedPayload: { body: 'edited' },
    });
    expect(repo['updateStatus']).toHaveBeenCalledWith(
      'q1',
      AiActionQueueStatus.APPROVED,
      expect.objectContaining({ editedPayload: { body: 'edited' } }),
    );
  });

  it('bulkApprove rejects CRITICAL items', async () => {
    const repo = makeRepo({
      findByIdAndUser: jest.fn((id: string) => {
        if (id === 'q-crit') return Promise.resolve(makeRow({ id, riskLabel: AiActionRiskLabel.CRITICAL }));
        return Promise.resolve(makeRow({ id }));
      }),
      updateStatus: jest.fn().mockResolvedValue(makeRow({ status: AiActionQueueStatus.APPROVED })),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await service.bulkApprove({
      userId: 'u1',
      queueIds: ['q1', 'q-crit', 'q3'],
    });
    expect(result.approvedIds).toEqual(['q1', 'q3']);
    expect(result.rejectedIds).toEqual(['q-crit']);
    expect(result.reasons['q-crit']).toBe('CRITICAL_RISK_REQUIRES_INDIVIDUAL_REVIEW');
  });

  it('bulkApprove records NOT_FOUND for missing rows', async () => {
    const repo = makeRepo({
      findByIdAndUser: jest.fn((id: string) => {
        if (id === 'q-missing') return Promise.resolve(null);
        return Promise.resolve(makeRow({ id }));
      }),
      updateStatus: jest.fn().mockResolvedValue(makeRow()),
    });
    const service = new AiActionApprovalQueueService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRabbit() as any,
    );
    const result = await service.bulkApprove({ userId: 'u1', queueIds: ['q1', 'q-missing'] });
    expect(result.rejectedIds).toEqual(['q-missing']);
    expect(result.reasons['q-missing']).toBe('NOT_FOUND');
  });
});
