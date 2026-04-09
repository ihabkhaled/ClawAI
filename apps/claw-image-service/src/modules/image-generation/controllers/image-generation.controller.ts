import { Body, Controller, Get, MessageEvent, Param, Post, Query, Sse } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Public } from '../../../app/decorators/public.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ImageGenerationService } from '../services/image-generation.service';
import { ImageGenerationEventsService } from '../services/image-generation-events.service';
import { type ListImagesQueryDto, listImagesQuerySchema } from '../dto/generate-image.dto';

@Controller('images')
export class ImageGenerationController {
  constructor(
    private readonly imageService: ImageGenerationService,
    private readonly eventsService: ImageGenerationEventsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listImagesQuerySchema)) query: ListImagesQueryDto,
  ): Promise<unknown> {
    return this.imageService.listByUser(user.id, query);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.imageService.getByIdForUser(id, user.id);
  }

  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.imageService.retryGeneration(id);
    return { generationId: record.id, status: record.status };
  }

  @Post(':id/retry-alternate')
  async retryAlternate(
    @Param('id') id: string,
    @CurrentUser() _user: AuthenticatedUser,
    @Body() body?: { provider?: string; model?: string },
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const record = await this.imageService.retryWithAlternateModel(id, body?.provider, body?.model);
    return {
      generationId: record.id,
      status: record.status,
      provider: record.provider,
      model: record.model,
    };
  }

  @Public()
  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(id);
  }
}
