import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { MarketplaceRepository } from '../repositories/marketplace.repository';
import { dslFromJson } from '../../recipes/utilities/dsl-cast.utility';
import { sandboxAnalyse } from '../utilities/sandbox-runner.utility';
import {
  canonicaliseDsl,
  verifyRecipeDslSignature,
} from '../utilities/signature.utility';
import { Prisma, type MarketplaceListing } from '../../../generated/prisma';
import type { ListListingsQueryDto, PublishListingDto } from '../dto/publish-listing.dto';
import type { PaginatedListings } from '../types/marketplace.types';
import type { SandboxResult } from '../types/sandbox.types';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private readonly repo: MarketplaceRepository) {}

  async publish(userId: string, dto: PublishListingDto): Promise<MarketplaceListing> {
    this.logger.debug(`publish: userId=${userId} name=${dto.name}`);
    const canonical = canonicaliseDsl(dto.dsl);
    const valid = verifyRecipeDslSignature(canonical, dto.signature, dto.signaturePublicKey);
    if (!valid) {
      throw new BusinessException(
        'agent.marketplace.invalid_signature',
        'MARKETPLACE_SIGNATURE_INVALID',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { name: dto.name },
      );
    }
    return this.repo.createListing({
      publisherUserId: userId,
      name: dto.name,
      description: dto.description ?? null,
      dsl: dto.dsl as Prisma.InputJsonValue,
      signaturePublicKey: dto.signaturePublicKey,
      signature: dto.signature,
      status: 'PUBLISHED',
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
    });
  }

  async list(query: ListListingsQueryDto): Promise<PaginatedListings> {
    return this.repo.listPublishedListings(query);
  }

  async getById(id: string): Promise<MarketplaceListing> {
    const listing = await this.repo.findListingById(id);
    if (listing === null) {
      throw new EntityNotFoundException('MarketplaceListing', id);
    }
    return listing;
  }

  /**
   * Re-verifies the listing's signature on every install (defense in
   * depth — the row in the DB could in theory be tampered with by
   * privileged DB access, but the signature still has to verify).
   */
  async install(listingId: string, userId: string): Promise<MarketplaceListing> {
    const listing = await this.getById(listingId);
    const canonical = canonicaliseDsl(listing.dsl);
    if (!verifyRecipeDslSignature(canonical, listing.signature, listing.signaturePublicKey)) {
      throw new BusinessException(
        'agent.marketplace.signature_revalidation_failed',
        'MARKETPLACE_SIGNATURE_REVALIDATION_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { listingId },
      );
    }
    // Defense in depth — even a legitimately-signed recipe goes through
    // static analysis + worker_threads dry-run before install.
    const sandbox = await sandboxAnalyse(dslFromJson(listing.dsl));
    if (sandbox.status !== 'OK') {
      throw new BusinessException(
        'agent.marketplace.sandbox_blocked',
        'MARKETPLACE_SANDBOX_BLOCKED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          listingId,
          sandboxStatus: sandbox.status,
          findings: [...sandbox.staticFindings, ...sandbox.runtimeFindings],
          error: sandbox.error,
        },
      );
    }
    await this.repo.incrementInstalls(listingId);
    await this.repo.recordInstall(listingId, userId, null);
    this.logger.log(`install: listing ${listingId} by user ${userId} sandbox=OK`);
    return listing;
  }

  /**
   * Public sandbox-analyse endpoint: lets the frontend show the user
   * what the static analyser found BEFORE they confirm install.
   */
  async analyseListing(listingId: string): Promise<SandboxResult> {
    const listing = await this.getById(listingId);
    return sandboxAnalyse(dslFromJson(listing.dsl));
  }
}
