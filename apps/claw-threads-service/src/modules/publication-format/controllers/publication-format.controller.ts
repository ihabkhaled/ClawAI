import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser, ThreadFormatPreview } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type FormatPublicationDto, formatPublicationSchema } from '../dto/format-publication.dto';
import { PublicationFormatService } from '../services/publication-format.service';

@Controller('thread-publications/:publicationId')
export class PublicationFormatController {
  constructor(private readonly format: PublicationFormatService) {}

  /** Owner only: the signed-in user is the only owner id the service ever sees. */
  @Post('format-preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Param('publicationId') publicationId: string,
    @Body(new ZodValidationPipe(formatPublicationSchema)) body: FormatPublicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ThreadFormatPreview> {
    return this.format.preview(publicationId, user.id, body);
  }
}
