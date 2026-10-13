import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import { KeyedMutex } from '../../../common/utilities/keyed-mutex.utility';
import { MAX_QUEUED_OWNER_REQUESTS } from '../constants/generation-start-gate.constants';

/**
 * Serialises one owner's start and retry requests inside this process, so the idempotency lookup,
 * the active-generation cap and the enqueue of one request finish before the next one looks.
 * Different owners never wait for each other. It also remembers which jobs are between "queued
 * upstream" and "attached to a publication", so the orphan repair never cancels one of them.
 * One threads-service replica is assumed (documented in the service guide, ADR-176).
 */
@Injectable()
export class GenerationStartGate {
  private readonly mutex = new KeyedMutex();
  private readonly attaching = new Set<string>();

  async run<T>(ownerId: string, task: () => Promise<T>): Promise<T> {
    if (this.mutex.pending(ownerId) >= MAX_QUEUED_OWNER_REQUESTS) {
      throw new HttpException(
        codedErrorBody(
          'Too many Thread generation requests at once. Wait a moment and try again.',
          ThreadGenerationErrorCode.TOO_MANY_ACTIVE,
          HttpStatus.TOO_MANY_REQUESTS,
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.mutex.run(ownerId, task);
  }

  /** Marks a job as being attached; the returned function clears the mark. */
  beginAttach(jobId: string): () => void {
    this.attaching.add(jobId);
    return () => {
      this.attaching.delete(jobId);
    };
  }

  isAttaching(jobId: string): boolean {
    return this.attaching.has(jobId);
  }
}
