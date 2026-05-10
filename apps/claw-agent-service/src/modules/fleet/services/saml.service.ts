import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { OrganizationRepository } from '../repositories/organization.repository';
import { parseSamlResponse, verifySamlSignature } from '../utilities/saml-verifier.utility';
import { Prisma } from '../../../generated/prisma';
import type { SamlCallbackDto, SetOrgSsoMetadataDto } from '../dto/saml.dto';
import type { OrgSsoMetadata, SamlVerificationResult } from '../types/saml.types';

@Injectable()
export class SamlService {
  private readonly logger = new Logger(SamlService.name);

  constructor(private readonly orgRepo: OrganizationRepository) {}

  async setMetadata(slug: string, dto: SetOrgSsoMetadataDto): Promise<void> {
    this.logger.debug(`setMetadata: slug=${slug}`);
    const org = await this.orgRepo.findBySlug(slug);
    if (org === null) {
      throw new EntityNotFoundException('Organization', slug);
    }
    await this.orgRepo.updateMetadata(org.id, {
      ssoEnabled: true,
      ssoMetadataJson: dto as Prisma.InputJsonValue,
    });
    this.logger.log(`setMetadata: org ${slug} sso enabled`);
  }

  async handleCallback(
    organizationSlug: string,
    dto: SamlCallbackDto,
  ): Promise<{ nameId: string; orgId: string; attributes: { name: string; values: string[] }[] }> {
    this.assertSlugMatch(organizationSlug, dto.organizationSlug);
    const org = await this.loadEnabledOrg(organizationSlug);
    const meta = this.requireSsoMetadata(org.ssoMetadataJson as Prisma.JsonValue, organizationSlug);
    const parsed = parseSamlResponse(dto.SAMLResponse);
    const result: SamlVerificationResult = verifySamlSignature(parsed, meta.expectedIssuer);
    if (!result.ok) {
      this.logger.warn(
        `handleCallback: SAML verification failed slug=${organizationSlug} reason=${result.reason}`,
      );
      throw new BusinessException(
        'agent.fleet.saml_verification_failed',
        'SAML_VERIFICATION_FAILED',
        HttpStatus.UNAUTHORIZED,
        { reason: result.reason },
      );
    }
    this.logger.log(`handleCallback: SAML verified for ${result.nameId} in ${organizationSlug}`);
    return { nameId: result.nameId, orgId: org.id, attributes: result.attributes };
  }

  private assertSlugMatch(pathSlug: string, bodySlug: string): void {
    if (pathSlug !== bodySlug) {
      throw new BusinessException(
        'agent.fleet.slug_mismatch',
        'SAML_SLUG_MISMATCH',
        HttpStatus.BAD_REQUEST,
        { pathSlug, bodySlug },
      );
    }
  }

  private async loadEnabledOrg(
    slug: string,
  ): Promise<NonNullable<Awaited<ReturnType<OrganizationRepository['findBySlug']>>>> {
    const org = await this.orgRepo.findBySlug(slug);
    if (org === null) {
      throw new EntityNotFoundException('Organization', slug);
    }
    if (!org.ssoEnabled) {
      throw new BusinessException(
        'agent.fleet.sso_disabled',
        'SSO_DISABLED',
        HttpStatus.FORBIDDEN,
        { slug },
      );
    }
    return org;
  }

  private requireSsoMetadata(metadataJson: Prisma.JsonValue, slug: string): OrgSsoMetadata {
    const meta = metadataJson as OrgSsoMetadata | null;
    if (meta === null) {
      throw new BusinessException(
        'agent.fleet.sso_not_configured',
        'SSO_NOT_CONFIGURED',
        HttpStatus.PRECONDITION_FAILED,
        { slug },
      );
    }
    return meta;
  }
}
