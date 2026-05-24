import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { MarketplaceListing, Prisma } from '../../../generated/prisma';
import type { ListListingsQueryDto } from '../dto/publish-listing.dto';
import type { PaginatedListings } from '../types/marketplace.types';

@Injectable()
export class MarketplaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(data: Prisma.MarketplaceListingCreateInput): Promise<MarketplaceListing> {
    return this.prisma.marketplaceListing.create({ data });
  }

  async findListingById(id: string): Promise<MarketplaceListing | null> {
    return this.prisma.marketplaceListing.findUnique({ where: { id } });
  }

  async listPublishedListings(query: ListListingsQueryDto): Promise<PaginatedListings> {
    const where: Prisma.MarketplaceListingWhereInput = { status: 'PUBLISHED' };
    if (query.search !== undefined && query.search.length > 0) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        orderBy: [{ installs: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async incrementInstalls(id: string): Promise<void> {
    await this.prisma.marketplaceListing.update({
      where: { id },
      data: { installs: { increment: 1 } },
    });
  }

  async recordInstall(listingId: string, userId: string, recipeId: string | null): Promise<void> {
    await this.prisma.marketplaceInstall.upsert({
      where: { listingId_userId: { listingId, userId } },
      create: { listingId, userId, recipeId },
      update: { recipeId },
    });
  }

  // V2 Stream 06 — publisher portal: listings owned by a user.
  async listForPublisher(
    publisherUserId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: MarketplaceListing[]; total: number }> {
    const where: Prisma.MarketplaceListingWhereInput = { publisherUserId };
    const [data, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);
    return { data, total };
  }

  // V2 Stream 06 — publisher unpublish (sets status=HIDDEN, keeps installs intact).
  async setListingStatus(
    id: string,
    publisherUserId: string,
    status: 'PUBLISHED' | 'HIDDEN' | 'DRAFT',
  ): Promise<MarketplaceListing | null> {
    const row = await this.prisma.marketplaceListing.updateMany({
      where: { id, publisherUserId },
      data: { status },
    });
    if (row.count === 0) return null;
    return this.findListingById(id);
  }
}
