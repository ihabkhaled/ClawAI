import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { type Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ImageGenerationService } from '../services/image-generation.service';
import { ImageGenerationEventsService } from '../services/image-generation-events.service';
import { ImageGenerationOwnerGuard } from '../guards/image-generation-owner.guard';
import { type ImageCancelResult } from '../types/image-cancel.types';
import {
  type ListImagesQueryDto,
  listImagesQuerySchema,
  type RetryAlternateImageDto,
  retryAlternateImageSchema,
} from '../dto/generate-image.dto';

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

  // Owner only; carries `supersededById` and `latest` (the chain head), so a
  // card restored after a refresh shows what a fallback or alternate produced.
  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.imageService.getWithLatestForUser(id, user.id);
  }

  // Owner only: retry used to accept any id, so user A could re-run (and bill)
  // user B's job. A stranger gets the same 404 as a missing id.
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.imageService.retryGenerationForUser(id, user.id);
    return { generationId: record.id, status: record.status };
  }

  @Post(':id/retry-alternate')
  async retryAlternate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(retryAlternateImageSchema)) body: RetryAlternateImageDto,
  ): Promise<{ generationId: string; status: string; provider: string; model: string }> {
    const record = await this.imageService.retryWithAlternateModelForUser(
      id,
      user.id,
      body.provider,
      body.model,
    );
    return {
      generationId: record.id,
      status: record.status,
      provider: record.provider,
      model: record.model,
    };
  }

  // Owner only (stranger = missing-id 404). Idempotent: 200 with the row's
  // status after the call — CANCELLED, or the unchanged terminal status.
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImageCancelResult> {
    return this.imageService.cancelGenerationForUser(id, user.id);
  }

  // Owner only: this stream was @Public(), so anyone holding an id could watch
  // the job's status, prompt-derived errors and asset links. The global
  // AuthGuard authenticates; the owner guard refuses before a stream opens.
  @UseGuards(ImageGenerationOwnerGuard)
  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(id);
  }
}
