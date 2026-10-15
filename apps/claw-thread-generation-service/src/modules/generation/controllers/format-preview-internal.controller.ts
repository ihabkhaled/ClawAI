import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type FormatPreviewDto,
  type FormatPreviewResult,
  formatPreviewSchema,
} from '../dto/format-preview.dto';
import { FormatPreviewService } from '../services/format-preview.service';

@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/threads/format-preview')
export class FormatPreviewInternalController {
  constructor(private readonly formatPreview: FormatPreviewService) {}

  /** Owner scope is enforced by threads-service, which only sends the owner's own published text. */
  @Post()
  @HttpCode(HttpStatus.OK)
  preview(
    @Body(new ZodValidationPipe(formatPreviewSchema)) body: FormatPreviewDto,
  ): Promise<FormatPreviewResult> {
    return this.formatPreview.preview(body);
  }
}
