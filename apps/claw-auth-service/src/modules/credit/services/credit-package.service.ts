import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, type CreditPackageView } from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { type CreditPackageVersion } from '../../../generated/prisma';
import { CreditPackageRepository } from '../repositories/credit-package.repository';
import { toPackageView } from '../utilities/credit-view.utility';

/**
 * The top-up catalog, server-priced.
 *
 * Nothing here accepts an amount from a caller. A checkout is created from a
 * package id, and payment-service resolves the price by reading the immutable
 * version row this service returns — the same shape `PlanPriceVersion` already
 * enforces for subscriptions. A client-supplied amount anywhere in this path
 * would let the buyer choose what to pay.
 */
@Injectable()
export class CreditPackageService {
  private readonly logger = new Logger(CreditPackageService.name);

  constructor(private readonly packages: CreditPackageRepository) {}

  /** Purchasable packages, each with its ACTIVE price version. */
  async listPurchasable(): Promise<CreditPackageView[]> {
    this.logger.debug('listPurchasable: reading the active catalog');
    const rows = await this.packages.listActive();
    return rows.flatMap((pkg) => {
      const version = pkg.versions.at(0);
      // A package with no active version is a half-configured row, not a free
      // one. Dropping it renders a shorter list; showing it would render a buy
      // button with no price behind it.
      return version === undefined ? [] : [toPackageView(pkg, version)];
    });
  }

  /**
   * The ACTIVE priced version of one package, for a top-up checkout.
   *
   * This is the server-pricing chokepoint for the whole top-up flow:
   * payment-service names a package id and reads the price back from here, so
   * there is no request shape in which a buyer can state what they will pay.
   *
   * Missing and inactive are DIFFERENT answers on purpose. A retired package is
   * a product decision the customer should be told about; an unknown id is a
   * malformed request. Collapsing them would make a withdrawn SKU look like a
   * bug to the person trying to buy it.
   */
  async requirePurchasable(packageId: string): Promise<CreditPackageView> {
    this.logger.debug(`requirePurchasable: package=${packageId}`);
    const pkg = await this.packages.findById(packageId);
    if (pkg === null) {
      throw new BusinessException(
        'Credit package not found',
        BillingErrorCode.CREDIT_PACKAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    const version = await this.packages.findActiveVersion(pkg.id);
    if (!pkg.isActive || version === null) {
      throw new BusinessException(
        'Credit package is not purchasable',
        BillingErrorCode.CREDIT_PACKAGE_INACTIVE,
        HttpStatus.CONFLICT,
      );
    }
    return toPackageView(pkg, version);
  }

  /** Every package with its full price history — operator view. */
  async listForOperator(): Promise<CreditPackageView[]> {
    const rows = await this.packages.listAll();
    return rows.flatMap((pkg) => {
      const version = pkg.versions.find((candidate) => candidate.isActive) ?? pkg.versions.at(0);
      return version === undefined ? [] : [toPackageView(pkg, version)];
    });
  }

  async createPackage(params: { slug: string; displayOrder: number }): Promise<CreditPackageView> {
    const existing = await this.packages.findBySlug(params.slug);
    if (existing !== null) {
      throw new BusinessException(
        'A credit package with this slug already exists',
        BillingErrorCode.CREDIT_PACKAGE_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }
    const created = await this.packages.create({
      slug: params.slug,
      displayOrder: params.displayOrder,
    });
    this.logger.log(`createPackage: slug=${params.slug}`);
    return toPackageView(created, CreditPackageService.emptyVersion(created.id));
  }

  /**
   * Publishes a NEW immutable price version and retires the previous one.
   *
   * A price is never edited in place. Somebody's completed purchase and every
   * historical invoice must keep meaning what was actually bought, and an
   * in-place edit would silently rewrite both.
   */
  async publishVersion(params: {
    packageId: string;
    priceMinor: number;
    currency: string;
    creditMicroUsd: bigint;
    actorUserId: string;
  }): Promise<CreditPackageView> {
    const pkg = await this.packages.findById(params.packageId);
    if (pkg === null) {
      throw new BusinessException(
        'Credit package not found',
        BillingErrorCode.CREDIT_PACKAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    const previous = await this.packages.findActiveVersion(pkg.id);
    const version = await this.packages.publishVersion({
      packageId: pkg.id,
      priceMinor: params.priceMinor,
      currency: params.currency,
      creditMicroUsd: params.creditMicroUsd,
      version: (await this.packages.findLatestVersionNumber(pkg.id)) + 1,
      createdByUserId: params.actorUserId,
      previousVersionId: previous?.id ?? null,
    });
    this.logger.log(`publishVersion: package=${pkg.slug} version=${String(version.version)}`);
    return toPackageView(pkg, version);
  }

  /**
   * A placeholder version for a package that has none yet.
   *
   * Priced at zero and NOT active, so it can never be mistaken for something
   * purchasable — `listPurchasable` filters it out, and the operator sees a
   * package awaiting its first price rather than a free one.
   */
  private static emptyVersion(packageId: string): CreditPackageVersion {
    const now = new Date();
    return {
      id: '',
      packageId,
      priceMinor: 0,
      currency: 'USD',
      creditMicroUsd: 0n,
      version: 0,
      isActive: false,
      activeKey: null,
      effectiveFrom: now,
      retiredAt: null,
      createdByUserId: null,
      createdAt: now,
    };
  }
}
