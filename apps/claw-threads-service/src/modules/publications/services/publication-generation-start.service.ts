import { Injectable } from '@nestjs/common';

import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import { GenerationPreflightService } from './generation-preflight.service';
import { PublicationLifecycleService } from './publication-lifecycle.service';

/** Starting a generation: refuse what cannot succeed, then queue the job and its publication. */
@Injectable()
export class PublicationGenerationStartService {
  constructor(
    private readonly preflight: GenerationPreflightService,
    private readonly lifecycle: PublicationLifecycleService,
  ) {}

  async start(
    ownerId: string,
    input: StartThreadGenerationDto,
  ): Promise<{ publicationId: string; jobId: string; status: string }> {
    await this.preflight.assertCanStart(ownerId, input);
    return this.lifecycle.enqueueGeneration(ownerId, input);
  }
}
