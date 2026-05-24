import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListListingsQueryDto,
  listListingsQuerySchema,
  type PublishListingDto,
  publishListingSchema,
} from '../dto/publish-listing.dto';
import { MarketplaceService } from '../services/marketplace.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { MarketplaceListing } from '../../../generated/prisma';
import type { PaginatedListings } from '../types/marketplace.types';

@Controller('agent/marketplace/listings')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Post()
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(publishListingSchema)) dto: PublishListingDto,
  ): Promise<MarketplaceListing> {
    return this.service.publish(user.id, dto);
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listListingsQuerySchema)) query: ListListingsQueryDto,
  ): Promise<PaginatedListings> {
    return this.service.list(query);
  }

  // V2 Stream 06 — publisher portal: current user's listings.
  // MUST be declared before @Get(':id') to avoid the literal "mine"
  // matching the :id route.
  @Get('mine')
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listListingsQuerySchema)) query: ListListingsQueryDto,
  ): Promise<PaginatedListings> {
    return this.service.listForPublisher(user.id, query.page, query.pageSize);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MarketplaceListing> {
    return this.service.getById(id);
  }

  // V2 Stream 06 — publisher portal: unpublish a listing (sets HIDDEN).
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MarketplaceListing> {
    return this.service.setStatus(id, user.id, 'HIDDEN');
  }

  // V2 Stream 06 — publisher portal: re-publish a previously hidden listing.
  @Post(':id/republish')
  @HttpCode(HttpStatus.OK)
  async republish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MarketplaceListing> {
    return this.service.setStatus(id, user.id, 'PUBLISHED');
  }

  @Post(':id/install')
  @HttpCode(HttpStatus.OK)
  async install(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MarketplaceListing> {
    return this.service.install(id, user.id);
  }

  @Get(':id/analyse')
  async analyse(@Param('id') id: string): Promise<unknown> {
    return this.service.analyseListing(id);
  }
}
