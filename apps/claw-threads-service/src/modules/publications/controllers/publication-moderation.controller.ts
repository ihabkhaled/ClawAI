import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RevokePublicationDto,
  revokePublicationSchema,
} from '../../publication-moderation/dto/revoke-publication.dto';
import { PublicationRevokeService } from '../../publication-moderation/services/publication-revoke.service';
import {
  type ModeratePublicationReportDto,
  moderatePublicationReportSchema,
} from '../dto/moderate-publication-report.dto';
import { PublicationCommunityService } from '../services/publication-community.service';
import { PublicationReportModerationService } from '../services/publication-report-moderation.service';

@Controller('thread-publications-moderation')
@RequirePermissions(Permission.THREAD_PUBLICATIONS_MODERATE)
export class PublicationModerationController {
  constructor(
    private readonly community: PublicationCommunityService,
    private readonly revocation: PublicationRevokeService,
    private readonly reportModeration: PublicationReportModerationService,
  ) {}

  @Get('reports')
  listReports(): ReturnType<PublicationCommunityService['listModerationReports']> {
    return this.community.listModerationReports();
  }

  @Patch('reports/:reportId')
  resolveReport(
    @Param('reportId') reportId: string,
    @Body(new ZodValidationPipe(moderatePublicationReportSchema))
    body: ModeratePublicationReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationReportModerationService['resolve']> {
    return this.reportModeration.resolve(reportId, user.id, body);
  }

  @Post('publications/:id/revoke')
  @HttpCode(200)
  revoke(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(revokePublicationSchema)) body: RevokePublicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<PublicationRevokeService['revoke']> {
    return this.revocation.revoke(id, user.id, body.reason);
  }
}
