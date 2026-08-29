import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { CreditChargeResolverService } from '../credit-charge-resolver.service';
import type { FxService } from '../../../fx/services/fx.service';
import type { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';

const USD_PACKAGE = {
  id: 'pkg-25',
  slug: 'credit-25',
  priceMinor: 2500,
  currency: 'USD',
  // Deliberately NOT 1:1 with the price. The ratio is the platform's margin and
  // lives in the database; a test that used 1:1 would pass even if the code
  // re-derived one number from the other.
  creditMicroUsd: 15_000_000,
  displayOrder: 3,
  versionId: 'cpv-9',
};

describe('CreditChargeResolverService', () => {
  let catalog: { requireActiveCreditPackage: jest.Mock; listCreditPackages: jest.Mock };
  let fx: { quote: jest.Mock };
  let service: CreditChargeResolverService;

  beforeEach(() => {
    catalog = { requireActiveCreditPackage: jest.fn(), listCreditPackages: jest.fn() };
    fx = { quote: jest.fn() };
    service = new CreditChargeResolverService(
      catalog as unknown as PlanCatalogClient,
      fx as unknown as FxService,
    );
  });

  it('charges the package version amount verbatim for a same-currency gateway', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue(USD_PACKAGE);

    const charge = await service.resolve('pkg-25', BillingGateway.PAYPAL);

    expect(charge.baseAmountMinor).toBe(2500);
    expect(charge.chargeAmountMinor).toBe(2500);
    expect(charge.chargeCurrency).toBe('USD');
    expect(charge.fxQuoteId).toBeNull();
    expect(fx.quote).not.toHaveBeenCalled();
  });

  it('binds the immutable version id so the purchase can be re-derived later', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue(USD_PACKAGE);

    const charge = await service.resolve('pkg-25', BillingGateway.PAYPAL);

    expect(charge.packageVersionId).toBe('cpv-9');
    expect(charge.packageId).toBe('pkg-25');
  });

  it('carries the credit as an exact BigInt, independent of the price', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue(USD_PACKAGE);

    const charge = await service.resolve('pkg-25', BillingGateway.PAYPAL);

    expect(charge.creditMicroUsd).toBe(15_000_000n);
  });

  it('freezes an FX quote for a non-USD settlement, exactly as the plan path does', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue(USD_PACKAGE);
    fx.quote.mockResolvedValue({
      quoteId: 'fx-1',
      quoteCurrency: 'EGP',
      convertedAmountMinor: 122_500,
      finalRateScaled: 4_900_000,
    });

    const charge = await service.resolve('pkg-25', BillingGateway.PAYMOB);

    expect(fx.quote).toHaveBeenCalledWith(2500, 'USD', 'EGP');
    expect(charge.baseAmountMinor).toBe(2500);
    expect(charge.baseCurrency).toBe('USD');
    expect(charge.chargeAmountMinor).toBe(122_500);
    expect(charge.chargeCurrency).toBe('EGP');
    expect(charge.fxQuoteId).toBe('fx-1');
    expect(charge.fxFinalRateScaled).toBe(4_900_000);
  });

  it('grants the package credit unchanged by FX', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue(USD_PACKAGE);
    fx.quote.mockResolvedValue({
      quoteId: 'fx-1',
      quoteCurrency: 'EGP',
      convertedAmountMinor: 122_500,
      finalRateScaled: 4_900_000,
    });

    const charge = await service.resolve('pkg-25', BillingGateway.PAYMOB);

    // Credit is a micro-USD service allowance. Converting it with the payment
    // FX rate would give an Egyptian customer 49x the credit for the same money.
    expect(charge.creditMicroUsd).toBe(15_000_000n);
  });

  it('refuses a zero-priced package rather than sending it to a gateway', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue({ ...USD_PACKAGE, priceMinor: 0 });

    await expect(service.resolve('pkg-25', BillingGateway.PAYPAL)).rejects.toMatchObject({
      code: BillingErrorCode.CREDIT_PACKAGE_INACTIVE,
    });
  });

  it('refuses a negative price', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue({ ...USD_PACKAGE, priceMinor: -100 });

    await expect(service.resolve('pkg-25', BillingGateway.PAYPAL)).rejects.toMatchObject({
      code: BillingErrorCode.CREDIT_PACKAGE_INACTIVE,
    });
  });

  it('refuses a priced package that grants no credit', async () => {
    catalog.requireActiveCreditPackage.mockResolvedValue({ ...USD_PACKAGE, creditMicroUsd: 0 });

    await expect(service.resolve('pkg-25', BillingGateway.PAYPAL)).rejects.toMatchObject({
      code: BillingErrorCode.CREDIT_PACKAGE_INACTIVE,
    });
  });

  it('never takes an amount from its caller — the only input is a package id', () => {
    // The signature is the assertion. `resolve` takes (packageId, gateway) and
    // nothing else, so there is no request shape that can name a price.
    expect(service.resolve).toHaveLength(2);
  });
});
