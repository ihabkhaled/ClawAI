import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { resolveUniqueActiveKey } from '../../../common/utilities/subscription-state-machine.utility';
import type { Subscription } from '../../../generated/prisma';
import type {
  CreateSubscriptionData,
  SubscriptionStatusChange,
} from '../types/subscription-repository.types';

// Pure data access. No business rules, no throwing — the service decides what a
// null means. Status is never written here without a caller having already run
// it through assertTransition().
@Injectable()
export class SubscriptionRepository {
  private readonly logger = new Logger(SubscriptionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSubscriptionData): Promise<Subscription> {
    this.logger.debug(`create: user=${data.userId} plan=${data.planSlug} gateway=${data.gateway}`);
    return this.prisma.subscription.create({
      data: {
        ...data,
        // Derived, never caller-supplied: this column is the database-level
        // guarantee of one effective subscription per user.
        uniqueActiveKey: resolveUniqueActiveKey(data.status as SubscriptionStatus, data.userId),
      },
    });
  }

  async findById(id: string): Promise<Subscription | null> {
    this.logger.debug(`findById: ${id}`);
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  // The user's one effective subscription, or null for a free user.
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    this.logger.debug(`findActiveByUserId: ${userId}`);
    return this.prisma.subscription.findUnique({ where: { uniqueActiveKey: userId } });
  }

  async findAllByUserId(userId: string): Promise<Subscription[]> {
    this.logger.debug(`findAllByUserId: ${userId}`);
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Looks a subscription up from a webhook by the blind index of its gateway
  // id, so the plaintext provider id is never stored or queried.
  async findByGatewayLookupHash(gateway: string, lookupHash: string): Promise<Subscription | null> {
    this.logger.debug(`findByGatewayLookupHash: gateway=${gateway}`);
    return this.prisma.subscription.findUnique({
      where: {
        gateway_gatewaySubscriptionLookupHash: {
          gateway,
          gatewaySubscriptionLookupHash: lookupHash,
        },
      },
    });
  }

  // Optimistic-concurrency update. Matching on the expected `version` is what
  // stops two simultaneous upgrades from both committing: the loser matches
  // zero rows and gets null back, which the service turns into a conflict.
  async updateStatusIfVersionMatches(
    change: SubscriptionStatusChange,
  ): Promise<Subscription | null> {
    this.logger.debug(
      `updateStatusIfVersionMatches: id=${change.id} to=${change.status} v=${String(change.expectedVersion)}`,
    );
    const result = await this.prisma.subscription.updateMany({
      where: { id: change.id, version: change.expectedVersion },
      data: {
        ...change.data,
        status: change.status,
        uniqueActiveKey: resolveUniqueActiveKey(change.status, change.userId),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      this.logger.warn(`updateStatusIfVersionMatches: version conflict on ${change.id}`);
      return null;
    }
    return this.findById(change.id);
  }

  // Subscriptions whose grace window has closed, for the downgrade sweep.
  async findGraceExpired(now: Date, limit: number): Promise<Subscription[]> {
    this.logger.debug(`findGraceExpired: before=${now.toISOString()} limit=${String(limit)}`);
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: { not: null, lte: now },
      },
      orderBy: { gracePeriodEndsAt: 'asc' },
      take: limit,
    });
  }

  async countGraceExpired(now: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: { not: null, lte: now },
      },
    });
  }

  // Downgrades that have come due.
  async findDueScheduledChanges(now: Date, limit: number): Promise<Subscription[]> {
    this.logger.debug(`findDueScheduledChanges: before=${now.toISOString()}`);
    return this.prisma.subscription.findMany({
      where: { scheduledEffectiveAt: { not: null, lte: now } },
      orderBy: { scheduledEffectiveAt: 'asc' },
      take: limit,
    });
  }

  async countDueScheduledChanges(now: Date): Promise<number> {
    return this.prisma.subscription.count({
      where: { scheduledEffectiveAt: { not: null, lte: now } },
    });
  }

  // Entitlement-bearing subscriptions whose window has lapsed without renewal —
  // the reconciliation job's "should this still be active?" query.
  async findLapsedEntitlements(now: Date, limit: number): Promise<Subscription[]> {
    this.logger.debug(`findLapsedEntitlements: before=${now.toISOString()}`);
    return this.prisma.subscription.findMany({
      where: {
        uniqueActiveKey: { not: null },
        entitlementValidUntil: { lte: now },
      },
      orderBy: { entitlementValidUntil: 'asc' },
      take: limit,
    });
  }

  async countByStatus(status: SubscriptionStatus): Promise<number> {
    this.logger.debug(`countByStatus: ${status}`);
    return this.prisma.subscription.count({ where: { status } });
  }

  async findProviderBoundNonTerminal(limit: number): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        encryptedGatewaySubscriptionId: { not: null },
        status: {
          in: [
            SubscriptionStatus.PENDING,
            SubscriptionStatus.INCOMPLETE,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.PAUSED,
            SubscriptionStatus.CANCEL_AT_PERIOD_END,
          ],
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  async countProviderBoundNonTerminal(): Promise<number> {
    return this.prisma.subscription.count({
      where: {
        encryptedGatewaySubscriptionId: { not: null },
        status: {
          in: [
            SubscriptionStatus.PENDING,
            SubscriptionStatus.INCOMPLETE,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.PAUSED,
            SubscriptionStatus.CANCEL_AT_PERIOD_END,
          ],
        },
      },
    });
  }
}
