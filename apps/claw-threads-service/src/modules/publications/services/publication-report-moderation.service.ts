import { BadRequestException, Injectable } from '@nestjs/common';

import { PublicationRevokeService } from '../../publication-moderation/services/publication-revoke.service';
import type { ModeratePublicationReportDto } from '../dto/moderate-publication-report.dto';
import { PublicationCommunityService } from './publication-community.service';

@Injectable()
export class PublicationReportModerationService {
  constructor(
    private readonly community: PublicationCommunityService,
    private readonly revocation: PublicationRevokeService,
  ) {}

  /** Resolves a report; a publication-level report can also revoke the publication. */
  async resolve(
    reportId: string,
    moderatorId: string,
    input: ModeratePublicationReportDto,
  ): Promise<{ resolved: true; revoked?: true }> {
    if (!input.revokePublication) {
      return this.community.resolveModerationReport(reportId, moderatorId, input);
    }
    const target = await this.revocation.findOpenReportTarget(reportId);
    if (target?.commentId) {
      throw new BadRequestException('Only a publication-level report can revoke the publication');
    }
    const resolved = await this.community.resolveModerationReport(reportId, moderatorId, input);
    if (!target) return resolved;
    await this.revocation.revoke(target.publicationId, moderatorId, undefined);
    return { ...resolved, revoked: true };
  }
}
