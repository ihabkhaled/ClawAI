import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodStatus } from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreatePaymentMethodData } from '../types/subscription-repository.types';
import { type PaymentMethod } from '../../../generated/prisma';

@Injectable()
export class PaymentMethodRepository {
  private readonly logger = new Logger(PaymentMethodRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async listActiveForUser(userId: string): Promise<PaymentMethod[]> {
    this.logger.debug(`listActiveForUser: user=${userId}`);
    return this.prisma.paymentMethod.findMany({
      where: { userId, deletedAt: null, status: PaymentMethodStatus.ACTIVE },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOwned(userId: string, id: string): Promise<PaymentMethod | null> {
    this.logger.debug(`findOwned: user=${userId} method=${id}`);
    return this.prisma.paymentMethod.findFirst({ where: { id, userId, deletedAt: null } });
  }

  /**
   * The row matching a token's blind index, if this card is already saved.
   *
   * Looked up by index rather than by decrypting every stored token: the index is
   * deterministic for a given token, so a duplicate is one query instead of N
   * decryptions, and no plaintext is ever materialised to make the comparison.
   */
  async findByBlindIndex(
    userId: string,
    gateway: string,
    tokenBlindIndex: string,
  ): Promise<PaymentMethod | null> {
    this.logger.debug(`findByBlindIndex: user=${userId} gateway=${gateway}`);
    return this.prisma.paymentMethod.findUnique({
      where: { userId_gateway_tokenBlindIndex: { userId, gateway, tokenBlindIndex } },
    });
  }

  /**
   * Vaults a payment method in a single insert.
   *
   * The caller mints the id and encrypts the token against it BEFORE calling, so
   * the row is written complete. The alternative — insert, then encrypt against
   * the generated id, then update — would leave a window in which a row exists
   * with no usable token, and any reader hitting that window sees a payment method
   * that cannot be charged.
   */
  async create(input: CreatePaymentMethodData): Promise<PaymentMethod> {
    this.logger.debug(`create: user=${input.userId} gateway=${input.gateway}`);
    return this.prisma.paymentMethod.create({
      data: {
        id: input.id,
        userId: input.userId,
        billingCustomerId: input.billingCustomerId,
        gateway: input.gateway,
        encryptedToken: input.encryptedToken,
        encryptionKeyVersion: input.encryptionKeyVersion,
        tokenBlindIndex: input.tokenBlindIndex,
        type: input.type,
        brand: input.brand,
        last4: input.last4,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        status: PaymentMethodStatus.ACTIVE,
        isDefault: input.isDefault,
        consentedAt: input.consentedAt,
      },
    });
  }

  /** Clears the default flag on every other method for this user. */
  async clearDefaultExcept(userId: string, keepId: string): Promise<void> {
    this.logger.debug(`clearDefaultExcept: user=${userId} keep=${keepId}`);
    await this.prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true, NOT: { id: keepId } },
      data: { isDefault: false },
    });
  }

  /**
   * Soft-deletes a vaulted method.
   *
   * The row is retained rather than removed because a past charge references
   * it, and an invoice that cannot say which card paid it is not reproducible.
   * The ciphertext stays put; it is unusable once the status flips.
   */
  async softDelete(userId: string, id: string): Promise<number> {
    this.logger.debug(`softDelete: user=${userId} method=${id}`);
    const result = await this.prisma.paymentMethod.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), status: PaymentMethodStatus.DELETED, isDefault: false },
    });
    return result.count;
  }
}
