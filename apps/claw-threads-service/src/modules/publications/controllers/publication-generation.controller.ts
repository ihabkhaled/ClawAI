import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type StartThreadGenerationDto,
  startThreadGenerationSchema,
} from '../dto/start-thread-generation.dto';
import { PublicationLifecycleService } from '../services/publication-lifecycle.service';

@Controller('thread-publications/generations')
export class PublicationGenerationController {
  constructor(private readonly lifecycle: PublicationLifecycleService) {}

  @Post()
  enqueue(
    @Body(new ZodValidationPipe(startThreadGenerationSchema)) body: StartThreadGenerationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ publicationId: string; jobId: string; status: string }> {
    return this.lifecycle.enqueueGeneration(user.id, body);
  }
}
