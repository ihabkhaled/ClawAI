import { WebhookEventStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { WebhookEventRepository } from '../webhook-event.repository';

type WebhookDelegate = {
  createMany: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
};

function buildPrisma(): { prisma: PrismaService; webhookEvent: WebhookDelegate } {
  const webhookEvent: WebhookDelegate = {
    createMany: jest.fn(async () => ({ count: 1 })),
    findUnique: jest.fn(async () => ({ id: 'wh_1' })),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => ({ id: 'wh_1' })),
    count: jest.fn(async () => 0),
  };
  return { prisma: { webhookEvent } as unknown as PrismaService, webhookEvent };
}

const EVENT = {
  gateway: 'PAYPAL',
  providerEventId: 'WH-123',
  eventType: 'PAYMENT.CAPTURE.COMPLETED',
  payloadHash: 'a'.repeat(64),
  signatureValid: true,
};

describe('WebhookEventRepository', () => {
  let webhookEvent: WebhookDelegate;
  let repository: WebhookEventRepository;

  beforeEach(() => {
    const built = buildPrisma();
    webhookEvent = built.webhookEvent;
    repository = new WebhookEventRepository(built.prisma);
    jest.spyOn(repository['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(repository['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('claim', () => {
    it('records the event as RECEIVED on first delivery', async () => {
      await repository.claim(EVENT);
      expect(webhookEvent.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ status: WebhookEventStatus.RECEIVED })],
        skipDuplicates: true,
      });
    });

    it('returns null on a replay, so no handler runs twice', async () => {
      // The unique index arbitrates — two replicas receiving the same gateway
      // retry concurrently cannot both win.
      webhookEvent.createMany.mockResolvedValueOnce({ count: 0 });
      await expect(repository.claim(EVENT)).resolves.toBeNull();
      expect(webhookEvent.findUnique).not.toHaveBeenCalled();
    });

    it('never persists the raw body, only its hash', async () => {
      await repository.claim(EVENT);
      const payload = webhookEvent.createMany.mock.calls[0]?.[0] as {
        data: Record<string, unknown>[];
      };
      const row = payload.data[0] ?? {};
      expect(row).not.toHaveProperty('body');
      expect(row).not.toHaveProperty('rawBody');
      expect(row['payloadHash']).toBe(EVENT.payloadHash);
    });
  });

  it('finds an event by its provider id', async () => {
    await repository.findByProviderEventId('PAYPAL', 'WH-123');
    expect(webhookEvent.findUnique).toHaveBeenCalledWith({
      where: { gateway_providerEventId: { gateway: 'PAYPAL', providerEventId: 'WH-123' } },
    });
  });

  it('increments attempts when marking processing', async () => {
    await repository.markProcessing('wh_1');
    expect(webhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'wh_1' },
      data: { status: WebhookEventStatus.PROCESSING, attempts: { increment: 1 } },
    });
  });

  it('records what a processed event acted on, for reconciliation', async () => {
    await repository.markProcessed('wh_1', 'sub_1', 'tx_1');
    expect(webhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'wh_1' },
      data: expect.objectContaining({
        status: WebhookEventStatus.PROCESSED,
        relatedSubscriptionId: 'sub_1',
        relatedTransactionId: 'tx_1',
      }),
    });
  });

  it('stores only a stable machine code on failure', async () => {
    await repository.markFailed('wh_1', 'HANDLER_ERROR');
    const call = webhookEvent.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data['errorCode']).toBe('HANDLER_ERROR');
    expect(JSON.stringify(call.data)).not.toMatch(/stack|at Object|https?:\/\//);
  });

  it('marks an irrelevant but verified event as ignored', async () => {
    await repository.markIgnored('wh_1');
    expect(webhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'wh_1' },
      data: expect.objectContaining({ status: WebhookEventStatus.IGNORED }),
    });
  });

  describe('recordInvalidSignature', () => {
    it('persists a forgery attempt so it is visible, not silent', async () => {
      await repository.recordInvalidSignature({ ...EVENT, signatureValid: false });
      expect(webhookEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            signatureValid: false,
            status: WebhookEventStatus.SIGNATURE_INVALID,
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('forces signatureValid false even if the caller passes true', async () => {
      await repository.recordInvalidSignature(EVENT);
      const payload = webhookEvent.createMany.mock.calls[0]?.[0] as {
        data: Record<string, unknown>[];
      };
      expect(payload.data[0]?.['signatureValid']).toBe(false);
    });
  });

  describe('findRetryable', () => {
    it('retries only events whose signature actually verified', async () => {
      // A forged webhook must never be retried into business state.
      await repository.findRetryable(5, 20);
      expect(webhookEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: WebhookEventStatus.FAILED,
          signatureValid: true,
          attempts: { lt: 5 },
        },
        orderBy: { receivedAt: 'asc' },
        take: 20,
      });
    });
  });

  it('counts by status', async () => {
    await repository.countByStatus(WebhookEventStatus.PROCESSED);
    expect(webhookEvent.count).toHaveBeenCalledWith({
      where: { status: WebhookEventStatus.PROCESSED },
    });
  });
});
