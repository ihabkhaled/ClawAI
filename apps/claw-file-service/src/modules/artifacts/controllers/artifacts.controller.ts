import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { ARTIFACT_PUBLISH_THROTTLE, ZERO_RETENTION_HEADER } from '../constants/artifact.constants';
import {
  type ArtifactIdParamDto,
  artifactIdParamSchema,
  type ListArtifactsQueryDto,
  listArtifactsQuerySchema,
} from '../dto/artifact-params.dto';
import { type PublishArtifactDto, publishArtifactSchema } from '../dto/publish-artifact.dto';
import { ArtifactsService } from '../services/artifacts.service';
import { type ArtifactSummary } from '../types/artifact.types';
import { isZeroRetentionRequested } from '../utilities/zero-retention-header.utility';

/** Owner surface: publish, list, delete. Every call is scoped to the caller. */
@Controller('artifacts')
@RequirePermissions(Permission.FILES_USE)
export class ArtifactsController {
  constructor(private readonly artifacts: ArtifactsService) {}

  @Post()
  @Throttle({ default: ARTIFACT_PUBLISH_THROTTLE })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Headers(ZERO_RETENTION_HEADER) zeroRetention: string | undefined,
    @Body(new ZodValidationPipe(publishArtifactSchema)) dto: PublishArtifactDto,
  ): Promise<ArtifactSummary> {
    return this.artifacts.publish(user.id, dto, isZeroRetentionRequested(zeroRetention));
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listArtifactsQuerySchema)) query: ListArtifactsQueryDto,
  ): Promise<PaginatedResult<ArtifactSummary>> {
    return this.artifacts.list(user.id, query.page, query.limit);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(artifactIdParamSchema)) params: ArtifactIdParamDto,
  ): Promise<void> {
    await this.artifacts.remove(user.id, params.id);
  }
}
