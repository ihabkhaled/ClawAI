import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { ContextPackVersion } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { ContextPackVersionService } from '../services/context-pack-version.service';
import { type SnapshotVersionDto, snapshotVersionSchema } from '../dto/snapshot-version.dto';
import type { VersionDiff } from '../types/context-pack-version.types';

@Controller('context-packs')
export class ContextPackVersionsController {
  constructor(private readonly service: ContextPackVersionService) {}

  @Get(':id/versions')
  async list(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPackVersion[]> {
    return this.service.listVersions(id, user.id);
  }

  @Get(':id/versions/:version')
  async getOne(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPackVersion> {
    return this.service.getVersion(id, version, user.id);
  }

  @Post(':id/versions/snapshot')
  async snapshot(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(snapshotVersionSchema)) dto: SnapshotVersionDto,
  ): Promise<ContextPackVersion> {
    return this.service.snapshotCurrent(id, user.id, dto.summary);
  }

  @Post(':id/versions/:version/revert')
  async revert(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPackVersion> {
    return this.service.revertToVersion(id, version, user.id);
  }

  @Get(':id/versions/:from/diff/:to')
  async diff(
    @Param('id') id: string,
    @Param('from', ParseIntPipe) from: number,
    @Param('to', ParseIntPipe) to: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VersionDiff> {
    return this.service.diff(id, from, to, user.id);
  }
}
