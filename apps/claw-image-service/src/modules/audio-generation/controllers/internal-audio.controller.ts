import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CancelAudioDto,
  cancelAudioSchema,
  type GenerateAudioDto,
  generateAudioSchema,
  type LinkAudioAssistantMessageDto,
  linkAudioAssistantMessageSchema,
} from '../dto/generate-audio.dto';
import { AudioGenerationService } from '../services/audio-generation.service';
import type { AudioInternalView } from '../types/audio-generation.types';

// `@Public()` only skips the USER JWT guard: a service has no user token.
// `ServiceTokenGuard` is what authenticates every route here.
@Controller('internal/audio')
@UseGuards(ServiceTokenGuard)
export class InternalAudioController {
  constructor(private readonly audioService: AudioGenerationService) {}

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateAudioSchema)) dto: GenerateAudioDto,
  ): Promise<{ id: string; status: string }> {
    const record = await this.audioService.enqueueGeneration(dto);
    return { id: record.id, status: record.status };
  }

  @Public()
  @Get(':id')
  async getGeneration(@Param('id') id: string): Promise<AudioInternalView> {
    return this.audioService.getInternalById(id);
  }

  @Public()
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelAudioSchema)) body: CancelAudioDto,
  ): Promise<{ id: string; status: string; cancelled: boolean }> {
    return this.audioService.cancelGenerationForUser(id, body.userId);
  }

  @Public()
  @Post(':id/assistant-message')
  @HttpCode(HttpStatus.OK)
  async linkAssistantMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(linkAudioAssistantMessageSchema))
    body: LinkAudioAssistantMessageDto,
  ): Promise<{ linked: number }> {
    const linked = await this.audioService.linkAssistantMessage(
      id,
      body.userId,
      body.assistantMessageId,
    );
    return { linked };
  }
}
