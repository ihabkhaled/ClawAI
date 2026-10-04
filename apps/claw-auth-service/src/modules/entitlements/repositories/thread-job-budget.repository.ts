import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ThreadJobBudgetState } from '../../../generated/prisma';

@Injectable()
export class ThreadJobBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRequest(userId: string, requestId: string) {
    return this.prisma.threadJobBudget.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });
  }

  create(input: {
    userId: string;
    requestId: string;
    capMicroUsd: bigint;
    featureReservationIds: string[];
  }) {
    return this.prisma.threadJobBudget.create({ data: input });
  }

  async reserveCall(input: {
    budgetId: string;
    requestId: string;
    creditReservationId: string | null;
    amountMicroUsd: bigint;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.threadJobBudgetCall.findUnique({
          where: { budgetId_requestId: { budgetId: input.budgetId, requestId: input.requestId } },
        });
        if (existing)
          return (
            existing.status === 'RESERVED' &&
            existing.reservedMicroUsd === input.amountMicroUsd &&
            existing.creditReservationId === input.creditReservationId
          );
        const budget = await tx.threadJobBudget.findUnique({ where: { id: input.budgetId } });
        if (
          !budget ||
          budget.status !== 'ACTIVE' ||
          budget.reservedMicroUsd + budget.spentMicroUsd + input.amountMicroUsd > budget.capMicroUsd
        )
          return false;
        const updated = await tx.threadJobBudget.updateMany({
          where: { id: budget.id, status: 'ACTIVE' },
          data: { reservedMicroUsd: { increment: input.amountMicroUsd } },
        });
        if (updated.count !== 1) return false;
        await tx.threadJobBudgetCall.create({
          data: {
            budgetId: input.budgetId,
            requestId: input.requestId,
            creditReservationId: input.creditReservationId,
            reservedMicroUsd: input.amountMicroUsd,
            status: 'RESERVED',
          },
        });
        return true;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async settleCall(budgetId: string, requestId: string, settledMicroUsd: bigint) {
    return this.prisma.$transaction(
      async (tx) => {
        const call = await tx.threadJobBudgetCall.findUnique({
          where: { budgetId_requestId: { budgetId, requestId } },
        });
        if (!call || call.status !== 'RESERVED' || settledMicroUsd > call.reservedMicroUsd)
          return false;
        await tx.threadJobBudgetCall.update({
          where: { id: call.id },
          data: { status: 'FINALIZED', settledMicroUsd, settledAt: new Date() },
        });
        await tx.threadJobBudget.update({
          where: { id: budgetId },
          data: {
            reservedMicroUsd: { decrement: call.reservedMicroUsd },
            spentMicroUsd: { increment: settledMicroUsd },
          },
        });
        return true;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async releaseCall(budgetId: string, requestId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const call = await tx.threadJobBudgetCall.findUnique({
          where: { budgetId_requestId: { budgetId, requestId } },
        });
        if (!call || call.status !== 'RESERVED') return false;
        await tx.threadJobBudgetCall.update({
          where: { id: call.id },
          data: { status: 'RELEASED', settledAt: new Date() },
        });
        await tx.threadJobBudget.update({
          where: { id: budgetId },
          data: { reservedMicroUsd: { decrement: call.reservedMicroUsd } },
        });
        return true;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async close(budgetId: string, status: ThreadJobBudgetState) {
    return this.prisma.$transaction(
      async (tx) => {
        const activeCalls = await tx.threadJobBudgetCall.count({
          where: { budgetId, status: 'RESERVED' },
        });
        if (activeCalls) return null;
        return tx.threadJobBudget.updateMany({
          where: { id: budgetId, status: 'ACTIVE' },
          data: { status, settledAt: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  get(budgetId: string) {
    return this.prisma.threadJobBudget.findUnique({ where: { id: budgetId } });
  }
}
