import { SubscriptionStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SubscriptionRepository } from '../subscription.repository';

type SubscriptionDelegate = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
  count: jest.Mock;
};

function buildPrisma(): { prisma: PrismaService; subscription: SubscriptionDelegate } {
  const subscription: SubscriptionDelegate = {
    create: jest.fn(async (args: unknown) => args),
    findUnique: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    updateMany: jest.fn(async () => ({ count: 1 })),
    count: jest.fn(async () => 0),
  };
  return { prisma: { subscription } as unknown as PrismaService, subscription };
}

const BASE_CREATE = {
  userId: 'user_1',
  billingCustomerId: 'bc_1',
  planId: 'plan_1',
  planSlug: 'pro',
  planPriceVersionId: 'pv_1',
  gateway: 'PAYPAL',
  billingInterval: 'MONTHLY',
  currency: 'USD',
  amountMinor: 2000,
  currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
  entitlementValidUntil: new Date('2026-08-01T00:00:00.000Z'),
};

describe('SubscriptionRepository', () => {
  let subscription: SubscriptionDelegate;
  let repository: SubscriptionRepository;

  beforeEach(() => {
    const built = buildPrisma();
    subscription = built.subscription;
    repository = new SubscriptionRepository(built.prisma);
  });

  describe('create', () => {
    it('derives uniqueActiveKey from the status rather than trusting the caller', async () => {
      await repository.create({ ...BASE_CREATE, status: SubscriptionStatus.ACTIVE });
      expect(subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ uniqueActiveKey: 'user_1' }),
      });
    });

    it('leaves uniqueActiveKey null for a status that carries no entitlement', async () => {
      // PENDING means no verified payment yet — it must not occupy the user's
      // one live-subscription slot.
      await repository.create({ ...BASE_CREATE, status: SubscriptionStatus.PENDING });
      expect(subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ uniqueActiveKey: null }),
      });
    });
  });

  describe('findActiveByUserId', () => {
    it('looks the user up by the unique active key', async () => {
      await repository.findActiveByUserId('user_1');
      expect(subscription.findUnique).toHaveBeenCalledWith({
        where: { uniqueActiveKey: 'user_1' },
      });
    });

    it('returns null for a free user rather than throwing', async () => {
      // Repositories return data or null; the service decides what that means.
      await expect(repository.findActiveByUserId('free_user')).resolves.toBeNull();
    });
  });

  describe('findByGatewayLookupHash', () => {
    it('queries by blind index, never by a plaintext provider id', async () => {
      await repository.findByGatewayLookupHash('PAYPAL', 'hash_abc');
      expect(subscription.findUnique).toHaveBeenCalledWith({
        where: {
          gateway_gatewaySubscriptionLookupHash: {
            gateway: 'PAYPAL',
            gatewaySubscriptionLookupHash: 'hash_abc',
          },
        },
      });
    });
  });

  describe('updateStatusIfVersionMatches', () => {
    it('matches on the expected version and increments it', async () => {
      subscription.findUnique.mockResolvedValueOnce({ id: 'sub_1' });
      await repository.updateStatusIfVersionMatches({
        id: 'sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.PAST_DUE,
        expectedVersion: 3,
        data: { pastDueAt: new Date('2026-07-25T00:00:00.000Z') },
      });

      expect(subscription.updateMany).toHaveBeenCalledWith({
        where: { id: 'sub_1', version: 3 },
        data: expect.objectContaining({
          status: SubscriptionStatus.PAST_DUE,
          version: { increment: 1 },
        }),
      });
    });

    it('recomputes uniqueActiveKey on every status change', async () => {
      subscription.findUnique.mockResolvedValueOnce({ id: 'sub_1' });
      await repository.updateStatusIfVersionMatches({
        id: 'sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.CANCELLED,
        expectedVersion: 1,
        data: {},
      });

      const call = subscription.updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data['uniqueActiveKey']).toBeNull();
    });

    it('keeps the slot occupied when moving to another entitlement-bearing status', async () => {
      subscription.findUnique.mockResolvedValueOnce({ id: 'sub_1' });
      await repository.updateStatusIfVersionMatches({
        id: 'sub_1',
        userId: 'user_1',
        status: SubscriptionStatus.CANCEL_AT_PERIOD_END,
        expectedVersion: 1,
        data: {},
      });

      const call = subscription.updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data['uniqueActiveKey']).toBe('user_1');
    });

    it('returns null on a version conflict instead of overwriting', async () => {
      // This is what stops two simultaneous upgrades from both committing.
      subscription.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        repository.updateStatusIfVersionMatches({
          id: 'sub_1',
          userId: 'user_1',
          status: SubscriptionStatus.ACTIVE,
          expectedVersion: 1,
          data: {},
        }),
      ).resolves.toBeNull();
      expect(subscription.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('sweep queries', () => {
    it('finds past-due subscriptions whose grace window has closed', async () => {
      const now = new Date('2026-07-25T00:00:00.000Z');
      await repository.findGraceExpired(now, 50);
      expect(subscription.findMany).toHaveBeenCalledWith({
        where: {
          status: SubscriptionStatus.PAST_DUE,
          gracePeriodEndsAt: { not: null, lte: now },
        },
        orderBy: { gracePeriodEndsAt: 'asc' },
        take: 50,
      });
    });

    it('finds scheduled downgrades that have come due', async () => {
      const now = new Date('2026-07-25T00:00:00.000Z');
      await repository.findDueScheduledChanges(now, 25);
      expect(subscription.findMany).toHaveBeenCalledWith({
        where: { scheduledEffectiveAt: { not: null, lte: now } },
        orderBy: { scheduledEffectiveAt: 'asc' },
        take: 25,
      });
    });

    it('counts grace expiry and due downgrade backlog with the same inclusive boundary', async () => {
      const now = new Date('2026-07-25T00:00:00.000Z');

      await repository.countGraceExpired(now);
      await repository.countDueScheduledChanges(now);

      expect(subscription.count).toHaveBeenNthCalledWith(1, {
        where: {
          status: SubscriptionStatus.PAST_DUE,
          gracePeriodEndsAt: { not: null, lte: now },
        },
      });
      expect(subscription.count).toHaveBeenNthCalledWith(2, {
        where: { scheduledEffectiveAt: { not: null, lte: now } },
      });
    });

    it('finds entitlements that lapsed without renewal', async () => {
      const now = new Date('2026-07-25T00:00:00.000Z');
      await repository.findLapsedEntitlements(now, 10);
      expect(subscription.findMany).toHaveBeenCalledWith({
        where: { uniqueActiveKey: { not: null }, entitlementValidUntil: { lte: now } },
        orderBy: { entitlementValidUntil: 'asc' },
        take: 10,
      });
    });
  });

  it('lists a user history newest first', async () => {
    await repository.findAllByUserId('user_1');
    expect(subscription.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('counts by status', async () => {
    await repository.countByStatus(SubscriptionStatus.ACTIVE);
    expect(subscription.count).toHaveBeenCalledWith({
      where: { status: SubscriptionStatus.ACTIVE },
    });
  });
});
