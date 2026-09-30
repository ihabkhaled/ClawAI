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
  type GenerateVideoDto,
  generateVideoSchema,
  type LinkVideoAssistantMessageDto,
  linkVideoAssistantMessageSchema,
} from '../dto/generate-video.dto';
import { VideoGenerationService } from '../services/video-generation.service';

// `@Public()` only skips the USER JWT guard: a service has no user token.
// `ServiceTokenGuard` is what authenticates every route here.
@Controller('internal/videos')
@UseGuards(ServiceTokenGuard)
export class InternalVideoController {
  constructor(private readonly videoService: VideoGenerationService) {}

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateVideoSchema)) dto: GenerateVideoDto,
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const record = await this.videoService.enqueueGeneration(dto);
    return {
      generationId: record.id,
      status: record.status,
      provider: record.provider,
      model: record.model,
    };
  }

  @Public()
  @Get(':generationId')
  async getGeneration(@Param('generationId') generationId: string): Promise<unknown> {
    return this.videoService.getById(generationId);
  }

  @Public()
  @Post(':generationId/assistant-message')
  @HttpCode(HttpStatus.OK)
  async linkAssistantMessage(
    @Param('generationId') generationId: string,
    @Body(new ZodValidationPipe(linkVideoAssistantMessageSchema))
    body: LinkVideoAssistantMessageDto,
  ): Promise<{ linked: number }> {
    const linked = await this.videoService.linkAssistantMessage(
      generationId,
      body.userId,
      body.assistantMessageId,
    );
    return { linked };
  }
}
