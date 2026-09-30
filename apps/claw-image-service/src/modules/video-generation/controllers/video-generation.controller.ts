import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { VideoGenerationService } from '../services/video-generation.service';
import type { VideoGenerationWithLatest } from '../types/video-generation.types';

@Controller('videos')
export class VideoGenerationController {
  constructor(private readonly videoService: VideoGenerationService) {}

  // Owner only; carries `latest`, the head of the AUTO fallback chain, so a card
  // restored after a refresh shows what a fallback attempt produced.
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VideoGenerationWithLatest> {
    return this.videoService.getWithLatestForUser(id, user.id);
  }

  // Owner only. A stranger gets the same 404 as a missing id.
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.videoService.retryGenerationForUser(id, user.id);
    return { generationId: record.id, status: record.status };
  }

  // Owner only. Idempotent: 200 with the row status after the call.
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; status: string; cancelled: boolean }> {
    return this.videoService.cancelGenerationForUser(id, user.id);
  }
}
