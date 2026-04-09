import { Body, Controller, Get, MessageEvent, Param, Post, Sse } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ImageGenerationService } from '../services/image-generation.service';
import { ImageGenerationEventsService } from '../services/image-generation-events.service';
import { generateImageSchema, type GenerateImageDto } from '../dto/generate-image.dto';

@Controller('internal/images')
export class InternalImageController {
  constructor(
    private readonly imageService: ImageGenerationService,
    private readonly eventsService: ImageGenerationEventsService,
  ) {}

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateImageSchema)) dto: GenerateImageDto,
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const record = await this.imageService.enqueueGeneration(dto);
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
    return this.imageService.getById(generationId);
  }

  @Public()
  @Post(':generationId/retry')
  async retry(
    @Param('generationId') generationId: string,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.imageService.retryGeneration(generationId);
    return { generationId: record.id, status: record.status };
  }

  @Public()
  @Post(':generationId/retry-alternate')
  async retryAlternate(
    @Param('generationId') generationId: string,
    @Body() body?: { provider?: string; model?: string },
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const record = await this.imageService.retryWithAlternateModel(
      generationId,
      body?.provider,
      body?.model,
    );
    return {
      generationId: record.id,
      status: record.status,
      provider: record.provider,
      model: record.model,
    };
  }

  @Public()
  @Sse(':generationId/events')
  events(@Param('generationId') generationId: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(generationId);
  }
}
