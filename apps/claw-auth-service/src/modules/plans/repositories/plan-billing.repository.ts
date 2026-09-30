import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type BillingIntervalKind,
  type PlanFeatureKey,
  type PlanFeatureRule,
  type PlanPriceVersion,
} from '../../../generated/prisma';
import { type PriceSetParams } from '../types/plan-interval-pricing.types';

@Injectable()
export class PlanBillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePrice(
    planId: string,
    billingInterval: BillingIntervalKind,
  ): Promise<PlanPriceVersion | null> {
    return this.prisma.planPriceVersion.findUnique({
      where: { activeKey: `${planId}:${billingInterval}` },
    });
  }

  async findPriceById(id: string): Promise<PlanPriceVersion | null> {
    return this.prisma.planPriceVersion.findUnique({ where: { id } });
  }

  async listActivePrices(): Promise<PlanPriceVersion[]> {
    return this.prisma.planPriceVersion.findMany({
      where: { isActive: true },
      orderBy: [{ planId: 'asc' }, { billingInterval: 'asc' }],
    });
  }

  async listPricesForPlan(planId: string): Promise<PlanPriceVersion[]> {
    return this.prisma.planPriceVersion.findMany({
      where: { planId },
      orderBy: [{ billingInterval: 'asc' }, { version: 'desc' }],
    });
  }

  // A price change RETIRES the previous version and inserts a new one in a
  // single transaction. Historical subscriptions and invoices keep pointing at
  // the version they purchased, so a repricing can never rewrite the past.
  async publishNewPrice(params: {
    planId: string;
    billingInterval: BillingIntervalKind;
    currency: string;
    amountMinor: number;
    createdByUserId: string | null;
  }): Promise<PlanPriceVersion> {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.planPriceVersion.findUnique({
        where: { activeKey: `${params.planId}:${params.billingInterval}` },
      });
      if (previous) {
        await tx.planPriceVersion.update({
          where: { id: previous.id },
          data: { isActive: false, activeKey: null, retiredAt: new Date() },
        });
      }
      return tx.planPriceVersion.create({
        data: {
          planId: params.planId,
          billingInterval: params.billingInterval,
          currency: params.currency,
          amountMinor: params.amountMinor,
          version: (previous?.version ?? 0) + 1,
          isActive: true,
          activeKey: `${params.planId}:${params.billingInterval}`,
          createdByUserId: params.createdByUserId,
        },
      });
    });
  }

  // One transaction for a whole price change: optionally the plan's discounts,
  // then each entry's retire-and-mint. A derived interval whose active amount
  // and currency already match is left alone (`force` false), so re-running a
  // sync never floods the history with identical versions.
  async publishPriceSet(params: PriceSetParams): Promise<PlanPriceVersion[]> {
    return this.prisma.$transaction(async (tx) => {
      if (params.discounts !== undefined || params.legacyDisplay !== undefined) {
        await tx.plan.update({
          where: { id: params.planId },
          data: { ...params.discounts, ...params.legacyDisplay },
        });
      }
      const minted: PlanPriceVersion[] = [];
      for (const entry of params.entries) {
        const activeKey = `${params.planId}:${entry.billingInterval}`;
        const previous = await tx.planPriceVersion.findUnique({ where: { activeKey } });
        if (
          !entry.force &&
          previous !== null &&
          previous.amountMinor === entry.amountMinor &&
          previous.currency === entry.currency
        ) {
          continue;
        }
        if (previous !== null) {
          await tx.planPriceVersion.update({
            where: { id: previous.id },
            data: { isActive: false, activeKey: null, retiredAt: new Date() },
          });
        }
        minted.push(
          await tx.planPriceVersion.create({
            data: {
              planId: params.planId,
              billingInterval: entry.billingInterval,
              currency: entry.currency,
              amountMinor: entry.amountMinor,
              version: (previous?.version ?? 0) + 1,
              isActive: true,
              activeKey,
              createdByUserId: params.createdByUserId,
            },
          }),
        );
      }
      return minted;
    });
  }

  async listFeatureRules(planId: string): Promise<PlanFeatureRule[]> {
    return this.prisma.planFeatureRule.findMany({ where: { planId } });
  }

  async findFeatureRule(planId: string, feature: PlanFeatureKey): Promise<PlanFeatureRule | null> {
    return this.prisma.planFeatureRule.findUnique({
      where: { planId_feature: { planId, feature } },
    });
  }
}
