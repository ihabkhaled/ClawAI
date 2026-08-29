import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, type BillingGateway } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { FxService } from '../../fx/services/fx.service';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { type CreditPackageVersionView } from '../../plan-catalog/types/plan-catalog.types';
import { resolveSettlementCurrency } from '../utilities/settlement-currency.utility';
import { type ResolvedCreditCharge } from '../types/credit-topup.types';

/**
 * Turns "this user wants this credit package" into an exact, defensible amount.
 *
 * The sibling of `ChargeResolverService`, and it exists for the same reason: a
 * charge is derived in ONE place and takes nothing from the request body. The
 * price and the credit both come from an immutable `CreditPackageVersion` in
 * auth-service, and the version id is frozen onto the session so a later
 * reprice cannot rewrite what a completed purchase was owed.
 *
 * FX follows the plan path exactly. A non-USD gateway settles against a bound
 * quote whose id is stored on the session, so the charge can be re-derived
 * years later — but the CREDIT granted is always the package's own figure, not
 * a converted one. Credit is a service allowance denominated in micro-USD; FX
 * changes what the customer's bank is charged, never how much the wallet gets.
 */
@Injectable()
export class CreditChargeResolverService {
  private readonly logger = new Logger(CreditChargeResolverService.name);

  constructor(
    private readonly catalog: PlanCatalogClient,
    private readonly fx: FxService,
  ) {}

  async resolve(packageId: string, gateway: BillingGateway): Promise<ResolvedCreditCharge> {
    this.logger.debug(`resolve: package=${packageId} gateway=${gateway}`);
    const pkg = await this.catalog.requireActiveCreditPackage(packageId);

    // A zero-priced package must not reach a gateway at all — some providers
    // accept it and produce a "paid" order for nothing, which would mint credit
    // against no money.
    if (pkg.priceMinor <= 0) {
      this.logger.error(`resolve: refusing non-positive price package=${packageId}`);
      throw new BillingException(BillingErrorCode.CREDIT_PACKAGE_INACTIVE);
    }
    // Nor may a priced package grant nothing. Charging for zero credit is the
    // mirror failure and is just as much a mispriced row.
    if (pkg.creditMicroUsd <= 0) {
      this.logger.error(`resolve: refusing non-positive credit package=${packageId}`);
      throw new BillingException(BillingErrorCode.CREDIT_PACKAGE_INACTIVE);
    }

    const settlementCurrency = resolveSettlementCurrency(gateway);
    if (settlementCurrency === null || settlementCurrency === pkg.currency) {
      return CreditChargeResolverService.sameCurrency(pkg);
    }
    return this.converted(pkg, settlementCurrency);
  }

  private static sameCurrency(pkg: CreditPackageVersionView): ResolvedCreditCharge {
    return {
      packageId: pkg.id,
      packageSlug: pkg.slug,
      packageVersionId: pkg.versionId,
      creditMicroUsd: BigInt(pkg.creditMicroUsd),
      baseAmountMinor: pkg.priceMinor,
      baseCurrency: pkg.currency,
      chargeAmountMinor: pkg.priceMinor,
      chargeCurrency: pkg.currency,
      fxQuoteId: null,
      fxFinalRateScaled: null,
    };
  }

  private async converted(
    pkg: CreditPackageVersionView,
    settlementCurrency: string,
  ): Promise<ResolvedCreditCharge> {
    const quote = await this.fx.quote(pkg.priceMinor, pkg.currency, settlementCurrency);
    this.logger.log(
      `resolve: converted ${String(pkg.priceMinor)} ${pkg.currency} -> ` +
        `${String(quote.convertedAmountMinor)} ${settlementCurrency} quote=${quote.quoteId}`,
    );
    return {
      packageId: pkg.id,
      packageSlug: pkg.slug,
      packageVersionId: pkg.versionId,
      creditMicroUsd: BigInt(pkg.creditMicroUsd),
      baseAmountMinor: pkg.priceMinor,
      baseCurrency: pkg.currency,
      chargeAmountMinor: quote.convertedAmountMinor,
      chargeCurrency: quote.quoteCurrency,
      fxQuoteId: quote.quoteId,
      fxFinalRateScaled: quote.finalRateScaled,
    };
  }
}
