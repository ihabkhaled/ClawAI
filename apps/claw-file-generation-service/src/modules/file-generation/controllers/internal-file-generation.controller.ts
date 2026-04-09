import { Body, Controller, Get, MessageEvent, Param, Post, Sse } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FileGenerationService } from '../services/file-generation.service';
import { FileGenerationEventsService } from '../services/file-generation-events.service';
import { type GenerateFileDto, generateFileSchema } from '../dto/generate-file.dto';

@Controller('internal/file-generations')
export class InternalFileGenerationController {
  constructor(
    private readonly fileGenService: FileGenerationService,
    private readonly eventsService: FileGenerationEventsService,
  ) {}

  @Public()
  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(generateFileSchema)) dto: GenerateFileDto,
  ): Promise<{ generationId: string; status: string; format: string }> {
    const record = await this.fileGenService.enqueueGeneration(dto);
    return { generationId: record.id, status: record.status, format: record.format };
  }

  @Public()
  @Get(':generationId')
  async getGeneration(@Param('generationId') generationId: string): Promise<unknown> {
    return this.fileGenService.getById(generationId);
  }

  @Public()
  @Post(':generationId/retry')
  async retry(
    @Param('generationId') generationId: string,
  ): Promise<{ generationId: string; status: string }> {
    const record = await this.fileGenService.retryGeneration(generationId);
    return { generationId: record.id, status: record.status };
  }

  @Public()
  @Sse(':generationId/events')
  events(@Param('generationId') generationId: string): Observable<MessageEvent> {
    return this.eventsService.subscribe(generationId);
  }
}
