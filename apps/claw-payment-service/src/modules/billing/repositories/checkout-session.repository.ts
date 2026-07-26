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

  /**
   * The session a gateway order belongs to.
   *
   * Paymob's card-token callback names only its own order id, so this is how a
   * saved card is attributed to a user: the order is one WE created and bound to a
   * session, and the session knows whose it is. Resolving the user from our own
   * records rather than from anything in the callback body means a forged payload
   * cannot attach a card to someone else's account.
   *
   * Newest first: a provider order id should be unique, but ordering makes the
   * result deterministic if a gateway ever reuses one.
   */
  async findByProviderOrderId(
    gateway: string,
    providerOrderId: string,
  ): Promise<CheckoutSession | null> {
    return this.prisma.checkoutSession.findFirst({
      where: { gateway, providerOrderId },
      orderBy: { createdAt: 'desc' },
    });
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
