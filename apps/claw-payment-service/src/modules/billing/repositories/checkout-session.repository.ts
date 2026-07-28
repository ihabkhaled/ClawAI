import { Injectable } from '@nestjs/common';
import { BillingGateway, CheckoutSessionStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CheckoutSession,
  CheckoutSessionPurpose,
  type Prisma,
} from '../../../generated/prisma';
import { CHECKOUT_CAPTURING_STATUS } from '../../checkout/constants/checkout.constants';

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
    status: CheckoutSessionStatus | typeof CHECKOUT_CAPTURING_STATUS,
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

  async claimForCapture(userId: string, id: string, providerOrderId: string): Promise<boolean> {
    const claimed = await this.prisma.checkoutSession.updateMany({
      where: {
        id,
        userId,
        gateway: BillingGateway.PAYPAL,
        providerOrderId,
        status: CheckoutSessionStatus.AWAITING_PAYMENT,
      },
      data: { status: CHECKOUT_CAPTURING_STATUS },
    });
    return claimed.count === 1;
  }

  async markPaymentMethodSetupCompleted(id: string): Promise<void> {
    await this.prisma.checkoutSession.update({
      where: { id },
      data: {
        status: CheckoutSessionStatus.COMPLETED,
        verifiedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  // Sessions that never completed and are past expiry. Reconciliation reads
  // these back FROM THE GATEWAY rather than assuming they failed — a payment
  // may well have succeeded while our callback was lost.
  async listExpiredPending(nowMs: number, limit: number): Promise<CheckoutSession[]> {
    return this.prisma.checkoutSession.findMany({
      where: {
        purpose: { not: CheckoutSessionPurpose.PAYMENT_METHOD_SETUP },
        status: {
          in: [
            CheckoutSessionStatus.CREATED,
            CheckoutSessionStatus.AWAITING_PAYMENT,
            CHECKOUT_CAPTURING_STATUS,
            CheckoutSessionStatus.VERIFIED,
          ],
        },
        expiresAt: { lt: new Date(nowMs) },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async countExpiredPending(nowMs: number): Promise<number> {
    return this.prisma.checkoutSession.count({
      where: {
        purpose: { not: CheckoutSessionPurpose.PAYMENT_METHOD_SETUP },
        status: {
          in: [
            CheckoutSessionStatus.CREATED,
            CheckoutSessionStatus.AWAITING_PAYMENT,
            CHECKOUT_CAPTURING_STATUS,
            CheckoutSessionStatus.VERIFIED,
          ],
        },
        expiresAt: { lt: new Date(nowMs) },
      },
    });
  }
}
