import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type StartThreadGenerationDto,
  startThreadGenerationSchema,
} from '../dto/start-thread-generation.dto';
import { PublicationGenerationStartService } from '../services/publication-generation-start.service';

@Controller('thread-publications/generations')
export class PublicationGenerationController {
  constructor(private readonly generationStart: PublicationGenerationStartService) {}

  @Post()
  enqueue(
    @Body(new ZodValidationPipe(startThreadGenerationSchema)) body: StartThreadGenerationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ publicationId: string; jobId: string; status: string }> {
    return this.generationStart.start(user.id, body);
  }
}
