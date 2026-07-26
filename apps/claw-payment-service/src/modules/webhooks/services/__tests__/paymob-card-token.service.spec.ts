import { BillingGateway } from '@claw/shared-types';

import { PaymobCardTokenService } from '../paymob-card-token.service';
import { WebhookOutcome } from '../../types/webhook.types';
import type { CheckoutSessionRepository } from '../../../billing/repositories/checkout-session.repository';
import type { PaymentMethodVaultService } from '../../../subscriptions/services/payment-method-vault.service';
import type { PaymobAdapter } from '../../../gateways/paymob/paymob.adapter';
import type { WebhookEventRepository } from '../../repositories/webhook-event.repository';

const HMAC = 'valid-hmac';

const SAVED_CARD = {
  gatewayToken: 'pmt_tok_live_9f3a2c8e4b1d',
  maskedPan: 'xxxx-xxxx-xxxx-4242',
  brand: 'Visa',
};

function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    obj: {
      id: 'TOKEN-EVENT-1',
      token: SAVED_CARD.gatewayToken,
      masked_pan: SAVED_CARD.maskedPan,
      card_subtype: 'Visa',
      order_id: 'PAYMOB-ORDER-1',
      exp_month: '04',
      exp_year: '28',
      ...overrides,
    },
  });
}

describe('PaymobCardTokenService', () => {
  let paymob: { extractSavedCard: jest.Mock };
  let events: {
    claim: jest.Mock;
    recordInvalidSignature: jest.Mock;
    markProcessing: jest.Mock;
    markProcessed: jest.Mock;
    markFailed: jest.Mock;
    markIgnored: jest.Mock;
  };
  let sessions: { findByProviderOrderId: jest.Mock };
  let vault: { vaultCard: jest.Mock };
  let service: PaymobCardTokenService;

  beforeEach(() => {
    paymob = { extractSavedCard: jest.fn().mockReturnValue(SAVED_CARD) };
    events = {
      claim: jest.fn().mockResolvedValue({ id: 'we-1' }),
      recordInvalidSignature: jest.fn(),
      markProcessing: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
      markIgnored: jest.fn(),
    };
    sessions = {
      findByProviderOrderId: jest.fn().mockResolvedValue({ id: 'cs-1', userId: 'user-1' }),
    };
    vault = {
      vaultCard: jest
        .fn()
        .mockResolvedValue({ paymentMethodId: 'pm-1', active: true, alreadyExisted: false }),
    };

    service = new PaymobCardTokenService(
      paymob as unknown as PaymobAdapter,
      events as unknown as WebhookEventRepository,
      sessions as unknown as CheckoutSessionRepository,
      vault as unknown as PaymentMethodVaultService,
    );
  });

  it('vaults a card from a verified callback', async () => {
    const result = await service.handle(body(), HMAC);

    expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
    expect(vault.vaultCard).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        gateway: BillingGateway.PAYMOB,
        gatewayToken: SAVED_CARD.gatewayToken,
        last4: '4242',
        expiryMonth: 4,
        expiryYear: 2028,
      }),
    );
  });

  it('never vaults an unverified callback', async () => {
    // extractSavedCard returns null unless the HMAC checks out, so an unverified
    // payload cannot reach the vault at all.
    paymob.extractSavedCard.mockReturnValue(null);

    const result = await service.handle(body(), 'forged');

    expect(result.outcome).toBe(WebhookOutcome.SIGNATURE_INVALID);
    expect(vault.vaultCard).not.toHaveBeenCalled();
    expect(events.claim).not.toHaveBeenCalled();
    // Recorded, not silently dropped — a forgery attempt is a security signal.
    expect(events.recordInvalidSignature).toHaveBeenCalledTimes(1);
  });

  it('resolves the owner from OUR records, not from the callback body', async () => {
    // A forged payload naming another user must not be able to attach a card to
    // their account. The only thing the body contributes is the order id.
    await service.handle(body({ user_id: 'attacker', userId: 'attacker' }), HMAC);

    expect(sessions.findByProviderOrderId).toHaveBeenCalledWith(
      BillingGateway.PAYMOB,
      'PAYMOB-ORDER-1',
    );
    expect(vault.vaultCard).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('fails when the callback names no known order', async () => {
    sessions.findByProviderOrderId.mockResolvedValue(null);

    const result = await service.handle(body(), HMAC);

    expect(result.outcome).toBe(WebhookOutcome.FAILED);
    expect(vault.vaultCard).not.toHaveBeenCalled();
    expect(events.markFailed).toHaveBeenCalledWith('we-1', 'PAYMENT_REFERENCE_MISMATCH');
  });

  it('treats a redelivered callback as a duplicate', async () => {
    // Gateways redeliver routinely; a second identical card is not acceptable.
    events.claim.mockResolvedValue(null);

    const result = await service.handle(body(), HMAC);

    expect(result.outcome).toBe(WebhookOutcome.DUPLICATE);
    expect(vault.vaultCard).not.toHaveBeenCalled();
  });

  it('records consent at the moment the callback arrives', async () => {
    // Reaching this callback means the customer ticked "save this card" in the
    // hosted form. That tick is the consent, and this is when it happened.
    await service.handle(body(), HMAC);

    const input = vault.vaultCard.mock.calls[0]?.[0] as { consentedAt: Date | null };
    expect(input.consentedAt).toBeInstanceOf(Date);
  });

  it('ignores an unparseable body rather than throwing', async () => {
    const result = await service.handle('not json', HMAC);

    expect(result.outcome).toBe(WebhookOutcome.IGNORED);
    expect(vault.vaultCard).not.toHaveBeenCalled();
  });

  it('passes no PAN beyond the last four digits', async () => {
    await service.handle(body(), HMAC);

    const input = vault.vaultCard.mock.calls[0]?.[0] as Record<string, unknown>;
    const serialised = JSON.stringify(input);
    expect(serialised).not.toContain(SAVED_CARD.maskedPan);
    expect(serialised).not.toContain('xxxx');
    expect(input['last4']).toBe('4242');
  });

  it('stores a null expiry rather than guessing when the gateway omits it', async () => {
    const result = await service.handle(
      JSON.stringify({
        obj: {
          id: 'TOKEN-EVENT-2',
          token: SAVED_CARD.gatewayToken,
          masked_pan: SAVED_CARD.maskedPan,
          order_id: 'PAYMOB-ORDER-1',
        },
      }),
      HMAC,
    );

    expect(result.outcome).toBe(WebhookOutcome.PROCESSED);
    const input = vault.vaultCard.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(input['expiryMonth']).toBeNull();
    expect(input['expiryYear']).toBeNull();
  });
});
