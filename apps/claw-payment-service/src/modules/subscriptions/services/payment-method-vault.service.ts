import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaymentMethodStatus } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { PaymentMethodType } from '../../../common/enums/payment-method-type.enum';
import {
  blindIndexGatewayToken,
  encryptGatewayToken,
} from '../../../common/utilities/token-vault.utility';
import { BillingCustomerRepository } from '../../webhooks/repositories/billing-customer.repository';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { type VaultCardInput, type VaultedMethod } from '../types/payment-method-vault.types';

/**
 * Vaults a gateway payment token.
 *
 * The single place a saved card comes into existence, and the only file that ever
 * holds a decrypted-adjacent value. Three properties it is responsible for:
 *
 * 1. **Consent is required, not implied.** A method arriving without an explicit
 *    consent timestamp is refused. Storing a reusable payment credential because
 *    somebody happened to pay once is not something to infer.
 * 2. **Duplicates are detected by blind index**, never by decrypting stored
 *    tokens. Saving the same card twice would leave the customer with two
 *    identical entries and no way to tell them apart.
 * 3. **The ciphertext is bound to the row it lives in.** The id is minted here so
 *    the token can be encrypted against `(userId, gateway, paymentMethodId)`
 *    before the single insert. Binding to anything other than the row it belongs
 *    to is the same as not binding at all.
 *
 * No method here logs the token, the masked PAN, or any provider body. The
 * only card fragment that reaches a log is nothing at all.
 */
@Injectable()
export class PaymentMethodVaultService {
  private readonly logger = new Logger(PaymentMethodVaultService.name);

  constructor(
    private readonly methods: PaymentMethodRepository,
    private readonly customers: BillingCustomerRepository,
  ) {}

  /**
   * Stores a verified gateway token, or returns the existing row when the card is
   * already saved.
   *
   * Idempotent by design: a redelivered card-token callback is common, and a
   * gateway retrying must not produce a second identical card.
   */
  async vaultCard(input: VaultCardInput): Promise<VaultedMethod> {
    this.logger.debug(`vaultCard: user=${input.userId} gateway=${input.gateway}`);

    if (input.consentedAt === null) {
      // Fail closed. A reusable payment credential is not something to store on
      // an assumption.
      this.logger.warn(`vaultCard: refused — no recorded consent for user=${input.userId}`);
      throw new Error('cannot vault a payment method without recorded consent');
    }

    const config = AppConfig.get();
    const blindIndex = blindIndexGatewayToken(
      input.gatewayToken,
      config.PAYMENT_TOKEN_ENCRYPTION_KEY,
    );

    const existing = await this.methods.findByBlindIndex(input.userId, input.gateway, blindIndex);
    if (existing !== null) {
      this.logger.log(`vaultCard: card already saved as ${existing.id} — returning it`);
      return PaymentMethodVaultService.toVaulted(existing.id, existing.status, true);
    }

    const customer = await this.customers.ensureForUser(input.userId, input.gateway);

    // The id is minted here rather than by the database so the token can be bound
    // to it before the row is written. Binding is what makes a ciphertext lifted
    // into another user's row undecryptable rather than chargeable, and it has to
    // name the row it belongs to — which means knowing the id first.
    const paymentMethodId = randomUUID();
    const encryptedToken = encryptGatewayToken(
      input.gatewayToken,
      config.PAYMENT_TOKEN_ENCRYPTION_KEY,
      config.PAYMENT_TOKEN_KEY_VERSION,
      { userId: input.userId, gateway: input.gateway, paymentMethodId },
    );

    const stored = await this.methods.create({
      id: paymentMethodId,
      encryptedToken,
      userId: input.userId,
      billingCustomerId: customer.id,
      gateway: input.gateway,
      tokenBlindIndex: blindIndex,
      encryptionKeyVersion: config.PAYMENT_TOKEN_KEY_VERSION,
      type: PaymentMethodType.CARD,
      brand: input.brand,
      last4: input.last4,
      expiryMonth: input.expiryMonth,
      expiryYear: input.expiryYear,
      isDefault: input.makeDefault,
      consentedAt: input.consentedAt,
    });

    if (input.makeDefault) {
      await this.methods.clearDefaultExcept(input.userId, stored.id);
    }

    this.logger.log(`vaultCard: stored method=${stored.id} for user=${input.userId}`);
    return PaymentMethodVaultService.toVaulted(stored.id, stored.status, false);
  }

  private static toVaulted(id: string, status: string, alreadyExisted: boolean): VaultedMethod {
    return {
      paymentMethodId: id,
      active: status === PaymentMethodStatus.ACTIVE,
      alreadyExisted,
    };
  }
}
