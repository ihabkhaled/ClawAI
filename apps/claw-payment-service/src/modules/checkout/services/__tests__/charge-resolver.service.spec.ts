import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { BillingException } from '../../../../common/errors';
import { ChargeResolverService } from '../charge-resolver.service';
import type { FxService } from '../../../fx/services/fx.service';
import type { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';

const USD_PRICE = {
  id: 'ppv-1',
  planId: 'plan-pro',
  billingInterval: 'MONTHLY',
  currency: 'USD',
  amountMinor: 1999,
  version: 2,
  isActive: true,
};

describe('ChargeResolverService', () => {
  let catalog: {
    requireActivePrice: jest.Mock;
    requirePriceVersion: jest.Mock;
    listCatalog: jest.Mock;
  };
  let fx: { quote: jest.Mock; requireFresh: jest.Mock };
  let service: ChargeResolverService;

  beforeEach(() => {
    catalog = {
      requireActivePrice: jest.fn(),
      requirePriceVersion: jest.fn(),
      listCatalog: jest.fn().mockResolvedValue([{ id: 'plan-pro', slug: 'pro' }]),
    };
    fx = { quote: jest.fn(), requireFresh: jest.fn() };
    service = new ChargeResolverService(
      catalog as unknown as PlanCatalogClient,
      fx as unknown as FxService,
    );
  });

  it('charges the price version amount verbatim for a same-currency gateway', async () => {
    catalog.requireActivePrice.mockResolvedValue(USD_PRICE);

    const charge = await service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL);

    expect(charge.baseAmountMinor).toBe(1999);
    expect(charge.chargeAmountMinor).toBe(1999);
    expect(charge.chargeCurrency).toBe('USD');
    // No FX quote is created when none is needed — a spurious quote would be a
    // second, unnecessary thing to keep fresh.
    expect(charge.fxQuoteId).toBeNull();
    expect(fx.quote).not.toHaveBeenCalled();
  });

  it('binds the price version id so the charge can be re-derived later', async () => {
    catalog.requireActivePrice.mockResolvedValue(USD_PRICE);

    const charge = await service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL);

    expect(charge.planPriceVersionId).toBe('ppv-1');
    expect(charge.planSlug).toBe('pro');
  });

  it('refuses checkout when the priced plan is no longer purchasable', async () => {
    catalog.requireActivePrice.mockResolvedValue(USD_PRICE);
    catalog.listCatalog.mockResolvedValue([]);

    await expect(
      service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL),
    ).rejects.toMatchObject({ code: BillingErrorCode.PLAN_NOT_PURCHASABLE });
  });

  it('converts to the settlement currency and freezes the rate for Paymob', async () => {
    catalog.requireActivePrice.mockResolvedValue(USD_PRICE);
    fx.quote.mockResolvedValue({
      quoteId: 'fx-1',
      baseCurrency: 'USD',
      quoteCurrency: 'EGP',
      sourceRateScaled: 480_000_000,
      finalRateScaled: 487_200_000,
      safetyMarginBps: 150,
      convertedAmountMinor: 97_391,
      expiresAtMs: 0,
      source: 'API',
    });

    const charge = await service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYMOB);

    expect(fx.quote).toHaveBeenCalledWith(1999, 'USD', 'EGP');
    // The base stays canonical USD; only the charge is EGP. Losing the base
    // would make the subscription's own price unreadable after settlement.
    expect(charge.baseAmountMinor).toBe(1999);
    expect(charge.baseCurrency).toBe('USD');
    expect(charge.chargeAmountMinor).toBe(97_391);
    expect(charge.chargeCurrency).toBe('EGP');
    expect(charge.fxQuoteId).toBe('fx-1');
    expect(charge.fxFinalRateScaled).toBe(487_200_000);
  });

  it('refuses a zero price rather than sending it to a gateway', async () => {
    // Some providers accept a zero-amount order and report it as paid, which
    // would hand out a paid plan for nothing.
    catalog.requireActivePrice.mockResolvedValue({ ...USD_PRICE, amountMinor: 0 });

    await expect(service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL)).rejects.toThrow(
      BillingException,
    );
  });

  it('refuses a negative price', async () => {
    catalog.requireActivePrice.mockResolvedValue({ ...USD_PRICE, amountMinor: -100 });

    await expect(
      service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL),
    ).rejects.toMatchObject({ code: BillingErrorCode.PLAN_NOT_PURCHASABLE });
  });

  it('propagates a catalog failure instead of inventing a price', async () => {
    catalog.requireActivePrice.mockRejectedValue(
      new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE),
    );

    await expect(
      service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYPAL),
    ).rejects.toMatchObject({ code: BillingErrorCode.PLAN_CATALOG_UNAVAILABLE });
  });

  it('skips conversion when the plan is already priced in the settlement currency', async () => {
    catalog.requireActivePrice.mockResolvedValue({ ...USD_PRICE, currency: 'EGP' });

    const charge = await service.resolve('plan-pro', 'MONTHLY', BillingGateway.PAYMOB);

    expect(fx.quote).not.toHaveBeenCalled();
    expect(charge.chargeCurrency).toBe('EGP');
  });
});
