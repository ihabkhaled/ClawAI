import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type GenerationOwnerStateDto,
  generationOwnerStateSchema,
} from '../dto/generation-owner-state.dto';
import { type EnqueueGenerationDto, enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import {
  type EnqueueRevisionReviewDto,
  enqueueRevisionReviewSchema,
} from '../dto/enqueue-revision-review.dto';
import { GenerationJobsService } from '../services/generation-jobs.service';

@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/threads/generations')
export class GenerationJobsInternalController {
  constructor(private readonly jobs: GenerationJobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  enqueue(
    @Body(new ZodValidationPipe(enqueueGenerationSchema)) body: EnqueueGenerationDto,
  ): ReturnType<GenerationJobsService['enqueue']> {
    return this.jobs.enqueue(body);
  }

  @Post('revision-reviews')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueRevisionReview(
    @Body(new ZodValidationPipe(enqueueRevisionReviewSchema)) body: EnqueueRevisionReviewDto,
  ): ReturnType<GenerationJobsService['enqueueRevisionReview']> {
    return this.jobs.enqueueRevisionReview(body);
  }

  @Post(':jobId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('jobId') jobId: string): ReturnType<GenerationJobsService['cancel']> {
    return this.jobs.cancel(jobId);
  }

  @Post(':jobId/owner-state')
  getOwnerState(
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(generationOwnerStateSchema)) body: GenerationOwnerStateDto,
  ): ReturnType<GenerationJobsService['getOwnerState']> {
    const { ownerId } = body;
    return this.jobs.getOwnerState(jobId, ownerId);
  }
}
