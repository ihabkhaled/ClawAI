import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ModeratePublicationReportDto,
  moderatePublicationReportSchema,
} from '../dto/moderate-publication-report.dto';
import { PublicationCommunityService } from '../services/publication-community.service';

@Controller('thread-publications-moderation')
@RequirePermissions(Permission.THREAD_PUBLICATIONS_MODERATE)
export class PublicationModerationController {
  constructor(private readonly community: PublicationCommunityService) {}

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
  ): ReturnType<PublicationCommunityService['resolveModerationReport']> {
    return this.community.resolveModerationReport(reportId, user.id, body);
  }
}
