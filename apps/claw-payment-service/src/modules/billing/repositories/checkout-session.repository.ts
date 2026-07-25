import { Injectable } from '@nestjs/common';
import { CheckoutSessionStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CheckoutSession, type Prisma } from '../../../generated/prisma';

@Injectable()
export class CheckoutSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CheckoutSessionCreateInput): Promise<CheckoutSession> {
    return this.prisma.checkoutSession.create({ data });
  }

  async findById(id: string): Promise<CheckoutSession | null> {
    return this.prisma.checkoutSession.findUnique({ where: { id } });
  }

  // Idempotency is scoped per user AND key, so one user's key can never collide
  // with another's, and a replayed request returns the original session instead
  // of creating a second payable order.
  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<CheckoutSession | null> {
    return this.prisma.checkoutSession.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
  }

  async markStatus(
    id: string,
    status: CheckoutSessionStatus,
    completedAt: Date | null = null,
  ): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id },
      data: { status, completedAt },
    });
  }

  async markVerified(id: string, providerOrderId: string): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id },
      data: {
        status: CheckoutSessionStatus.COMPLETED,
        providerOrderId,
        verifiedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  // Stable machine code only — never a provider error body, which can carry
  // payer details.
  async markFailed(id: string, failureCode: string): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id },
      data: { status: CheckoutSessionStatus.FAILED, failureCode },
    });
  }

  async attachProviderOrder(
    id: string,
    providerOrderId: string,
    hostedUrl: string | null,
  ): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id },
      data: {
        providerOrderId,
        hostedCheckoutUrl: hostedUrl,
        status: CheckoutSessionStatus.AWAITING_PAYMENT,
      },
    });
  }

  // Sessions that never completed and are past expiry. Reconciliation reads
  // these back FROM THE GATEWAY rather than assuming they failed — a payment
  // may well have succeeded while our callback was lost.
  async listExpiredPending(nowMs: number, limit: number): Promise<CheckoutSession[]> {
    return this.prisma.checkoutSession.findMany({
      where: {
        status: { in: [CheckoutSessionStatus.CREATED, CheckoutSessionStatus.AWAITING_PAYMENT] },
        expiresAt: { lt: new Date(nowMs) },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
