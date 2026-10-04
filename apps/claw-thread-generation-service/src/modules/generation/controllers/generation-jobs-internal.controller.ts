import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type EnqueueGenerationDto, enqueueGenerationSchema } from '../dto/enqueue-generation.dto';
import { GenerationJobsService } from '../services/generation-jobs.service';

@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/threads/generations')
export class GenerationJobsInternalController {
  constructor(private readonly jobs: GenerationJobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  enqueue(@Body(new ZodValidationPipe(enqueueGenerationSchema)) body: EnqueueGenerationDto) {
    return this.jobs.enqueue(body);
  }

  @Post(':jobId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('jobId') jobId: string) {
    return this.jobs.cancel(jobId);
  }
}
