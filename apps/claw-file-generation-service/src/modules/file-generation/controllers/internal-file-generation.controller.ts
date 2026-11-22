import {
  Body,
  Controller,
  Get,
  HttpCode,
  MessageEvent,
  Param,
  Post,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { type Observable } from 'rxjs';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { FileGenerationService } from '../services/file-generation.service';
import { FileGenerationEventsService } from '../services/file-generation-events.service';
import { PdfRenderService } from '../services/pdf-render.service';
import {
  type GenerateFileDto,
  generateFileSchema,
  type RenderPdfDto,
  renderPdfSchema,
} from '../dto/generate-file.dto';

@Controller('internal/file-generations')
@UseGuards(ServiceTokenGuard)
export class InternalFileGenerationController {
  constructor(
    private readonly fileGenService: FileGenerationService,
    private readonly eventsService: FileGenerationEventsService,
    private readonly pdfRenderService: PdfRenderService,
  ) {}

  /** Stateless Markdown → PDF; nothing stored (live-service export, ADR-221). */
  @Public()
  @Post('render-pdf')
  @HttpCode(200)
  renderPdf(
    @Body(new ZodValidationPipe(renderPdfSchema)) dto: RenderPdfDto,
    @Res() response: Response,
  ): void {
    const pdf = this.pdfRenderService.render(dto.content, dto.title ?? null);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(pdf);
  }

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
