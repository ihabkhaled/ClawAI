import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type CreditPackage,
  type CreditPackageVersion,
  type Prisma,
} from '../../../generated/prisma';

/**
 * The top-up catalog.
 *
 * A version row is IMMUTABLE. There is no `updateVersion` here on purpose:
 * repricing creates a new version and retires the old one, so a completed
 * purchase and every historical invoice keep meaning what was actually bought.
 */
@Injectable()
export class CreditPackageRepository {
  private readonly logger = new Logger(CreditPackageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active packages with their active version.
   *
   * `versions` is filtered to `isActive` and taken 1: a package always has
   * exactly one active version (enforced by the `activeKey` unique index), and
   * loading its whole price history to render a buy button would grow the
   * payload with every reprice.
   */
  async listActive(): Promise<Array<CreditPackage & { versions: CreditPackageVersion[] }>> {
    this.logger.debug('listActive: reading the purchasable catalog');
    return this.prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        versions: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
  }

  async listAll(): Promise<Array<CreditPackage & { versions: CreditPackageVersion[] }>> {
    this.logger.debug('listAll: reading the full catalog for an operator');
    return this.prisma.creditPackage.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  async findBySlug(slug: string): Promise<CreditPackage | null> {
    this.logger.debug(`findBySlug: slug=${slug}`);
    return this.prisma.creditPackage.findUnique({ where: { slug } });
  }

  async findById(id: string): Promise<CreditPackage | null> {
    this.logger.debug(`findById: id=${id}`);
    return this.prisma.creditPackage.findUnique({ where: { id } });
  }

  async findActiveVersion(packageId: string): Promise<CreditPackageVersion | null> {
    this.logger.debug(`findActiveVersion: package=${packageId}`);
    return this.prisma.creditPackageVersion.findUnique({ where: { activeKey: packageId } });
  }

  async findLatestVersionNumber(packageId: string): Promise<number> {
    const latest = await this.prisma.creditPackageVersion.findFirst({
      where: { packageId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest?.version ?? 0;
  }

  async create(data: Prisma.CreditPackageCreateInput): Promise<CreditPackage> {
    this.logger.debug('create: adding a package');
    return this.prisma.creditPackage.create({ data });
  }

  /**
   * Retires the current active version and inserts the next one, atomically.
   *
   * Both halves in one transaction because `activeKey` is UNIQUE: inserting
   * first would collide with the row still holding the key, and clearing first
   * would leave a window in which the package has NO price and the buy button
   * renders an empty card.
   */
  async publishVersion(params: {
    packageId: string;
    priceMinor: number;
    currency: string;
    creditMicroUsd: bigint;
    version: number;
    createdByUserId: string | null;
    previousVersionId: string | null;
  }): Promise<CreditPackageVersion> {
    this.logger.log(
      `publishVersion: package=${params.packageId} version=${String(params.version)}`,
    );
    return this.prisma.$transaction(async (tx) => {
      if (params.previousVersionId !== null) {
        await tx.creditPackageVersion.update({
          where: { id: params.previousVersionId },
          data: { isActive: false, activeKey: null, retiredAt: new Date() },
        });
      }
      return tx.creditPackageVersion.create({
        data: {
          packageId: params.packageId,
          priceMinor: params.priceMinor,
          currency: params.currency,
          creditMicroUsd: params.creditMicroUsd,
          version: params.version,
          isActive: true,
          activeKey: params.packageId,
          createdByUserId: params.createdByUserId,
        },
      });
    });
  }
}
