import { Body, Controller, Param, Post } from '@nestjs/common';
import type { RetrievalBundle } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types';
import { ContextPreviewService } from '../services/context-preview.service';
import { type PreviewContextDto, previewContextSchema } from '../dto/preview-context.dto';

@Controller('chat-threads')
export class ContextPreviewController {
  constructor(private readonly service: ContextPreviewService) {}

  @Post(':id/preview-context')
  async preview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(previewContextSchema)) dto: PreviewContextDto,
  ): Promise<RetrievalBundle> {
    return this.service.preview(id, user.id, dto);
  }
}
