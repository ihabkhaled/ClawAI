import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { AudioGenerationService } from '../services/audio-generation.service';
import type { AudioGenerationWithLatest } from '../types/audio-generation.types';

@Controller('audio')
export class AudioGenerationController {
  constructor(private readonly audioService: AudioGenerationService) {}

  // Owner only; carries `latest`, the head of the retry chain.
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AudioGenerationWithLatest> {
    return this.audioService.getWithLatestForUser(id, user.id);
  }

  // Owner only. A stranger gets the same 404 as a missing id.
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; status: string }> {
    const record = await this.audioService.retryGenerationForUser(id, user.id);
    return { id: record.id, status: record.status };
  }

  // Owner only. Idempotent: 200 with the row status after the call.
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; status: string; cancelled: boolean }> {
    return this.audioService.cancelGenerationForUser(id, user.id);
  }
}
