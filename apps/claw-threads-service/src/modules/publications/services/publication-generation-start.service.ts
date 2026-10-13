import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import { PublicationsRepository } from '../repositories/publications.repository';
import type { PublicationStartIdentity, StartGenerationResult } from '../types/publication.types';
import {
  scopedIdempotencyKey,
  startRequestFingerprint,
} from '../utilities/generation-idempotency.utility';
import { GenerationActiveCapService } from './generation-active-cap.service';
import { GenerationPreflightService } from './generation-preflight.service';
import { GenerationStartGate } from './generation-start-gate.service';
import { PublicationLifecycleService } from './publication-lifecycle.service';
import { ThreadsGenerationClient } from './threads-generation.client';

/**
 * Starting a generation: one request per owner at a time; a repeated key returns the job it
 * already made; otherwise refuse what cannot succeed, refuse an owner who is at the active cap,
 * then queue the job and its publication (undoing the job if the publication cannot be saved).
 */
@Injectable()
export class PublicationGenerationStartService {
  constructor(
    private readonly preflight: GenerationPreflightService,
    private readonly lifecycle: PublicationLifecycleService,
    private readonly gate: GenerationStartGate,
    private readonly activeCap: GenerationActiveCapService,
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  start(ownerId: string, input: StartThreadGenerationDto): Promise<StartGenerationResult> {
    return this.gate.run(ownerId, () => this.startSerialised(ownerId, input));
  }

  private async startSerialised(
    ownerId: string,
    input: StartThreadGenerationDto,
  ): Promise<StartGenerationResult> {
    const identity: PublicationStartIdentity = {
      keyHash: scopedIdempotencyKey(ownerId, input.idempotencyKey),
      requestHash: startRequestFingerprint(input),
    };
    const replay = await this.replayStartedGeneration(ownerId, identity);
    if (replay) return replay;
    await this.preflight.assertCanStart(ownerId, input);
    await this.activeCap.assertBelowCap(ownerId);
    try {
      return await this.lifecycle.enqueueGeneration(
        ownerId,
        { ...input, idempotencyKey: identity.keyHash },
        identity,
      );
    } catch (error: unknown) {
      throw (await this.preflight.explainBudgetDenial(ownerId, error)) ?? error;
    }
  }

  /** The same owner repeating a start gets the job it already has, never a second one. */
  private async replayStartedGeneration(
    ownerId: string,
    identity: PublicationStartIdentity,
  ): Promise<StartGenerationResult | null> {
    const prior = await this.publications.findStartByKey(ownerId, identity.keyHash);
    if (!prior) return null;
    if (prior.requestHash !== null && prior.requestHash !== identity.requestHash) {
      throw new ConflictException(
        codedErrorBody(
          'This idempotency key was already used for a different generation request. Use a new key.',
          ThreadGenerationErrorCode.IDEMPOTENCY_KEY_REUSED,
          HttpStatus.CONFLICT,
        ),
      );
    }
    const state = await this.generation.getPrivateState(prior.generationJobId, ownerId);
    return { publicationId: prior.id, jobId: prior.generationJobId, status: state.status };
  }
}
