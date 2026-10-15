import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ThreadFormatPreview } from '@claw/shared-types';

import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import {
  FORMAT_ALREADY_PRETTY_CODE,
  FORMAT_DAILY_LIMIT_MESSAGE,
  FORMAT_IN_PROGRESS_MESSAGE,
  FORMAT_NOT_FORMATTABLE_MESSAGE,
  FORMAT_NOT_FOUND_MESSAGE,
  FORMAT_PASSES_PER_DAY,
} from '../constants/publication-format.constants';
import type { FormatPublicationDto } from '../dto/format-publication.dto';
import { FormatPassErrorCode } from '../enums/format-pass-error-code.enum';
import { FormatPassStatus } from '../enums/format-pass-status.enum';
import { FormatPassRepository } from '../repositories/format-pass.repository';
import type { FormatPassRecord, FormatTarget } from '../types/publication-format.types';
import { ThreadsFormatClient } from './threads-format.client';

/**
 * "Improve formatting with AI" for a Thread's owner (ADR-189). It only PREVIEWS: nothing about the
 * published text changes here. Accepting the preview saves it as an ordinary edit of the revision
 * (`POST revisions`), which re-runs the safety checks and the Judge/Critic review before anything
 * is published again. Owner scope is the `findOwnedTarget` query itself: a missing Thread and
 * another owner's Thread both answer 404.
 */
@Injectable()
export class PublicationFormatService {
  constructor(
    private readonly passes: FormatPassRepository,
    private readonly generation: ThreadsFormatClient,
  ) {}

  async preview(
    publicationId: string,
    ownerId: string,
    dto: FormatPublicationDto,
  ): Promise<ThreadFormatPreview> {
    const target = await this.passes.findOwnedTarget(publicationId, ownerId);
    if (!target) throw new NotFoundException(FORMAT_NOT_FOUND_MESSAGE);
    if (!target.generationJobId) {
      throw new ConflictException(
        codedErrorBody(
          FORMAT_NOT_FORMATTABLE_MESSAGE,
          FormatPassErrorCode.NOT_FORMATTABLE,
          HttpStatus.CONFLICT,
        ),
      );
    }
    const reservation = await this.passes.reserve({
      publicationId,
      ownerId,
      revisionId: target.revisionId,
      idempotencyKey: dto.idempotencyKey,
    });
    if (reservation.outcome === 'LIMIT') {
      throw new HttpException(
        codedErrorBody(
          FORMAT_DAILY_LIMIT_MESSAGE,
          FormatPassErrorCode.DAILY_LIMIT,
          HttpStatus.TOO_MANY_REQUESTS,
          { limit: FORMAT_PASSES_PER_DAY },
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return reservation.outcome === 'REPLAY'
      ? this.replay(publicationId, target, reservation.pass)
      : this.run(
          publicationId,
          ownerId,
          { ...target, generationJobId: target.generationJobId },
          reservation.pass.id,
          dto,
        );
  }

  private async replay(
    publicationId: string,
    target: FormatTarget,
    pass: FormatPassRecord,
  ): Promise<ThreadFormatPreview> {
    if (pass.status === FormatPassStatus.PENDING) {
      throw new ConflictException(
        codedErrorBody(
          FORMAT_IN_PROGRESS_MESSAGE,
          FormatPassErrorCode.IN_PROGRESS,
          HttpStatus.CONFLICT,
        ),
      );
    }
    if (pass.status === FormatPassStatus.FAILED || pass.resultMarkdown === null) {
      return this.unchanged(publicationId, target, pass.code);
    }
    return {
      revisionId: pass.revisionId,
      originalMarkdown: target.markdown,
      contentLocale: target.contentLocale,
      status: pass.status === FormatPassStatus.FORMATTED ? 'FORMATTED' : 'SKIPPED',
      code: pass.code,
      markdown: pass.resultMarkdown,
      citations: target.citations,
      remainingToday: await this.remaining(publicationId),
    };
  }

  private async run(
    publicationId: string,
    ownerId: string,
    target: FormatTarget & { generationJobId: string },
    passId: string,
    dto: FormatPublicationDto,
  ): Promise<ThreadFormatPreview> {
    try {
      const reply = await this.generation.preview({
        ownerId,
        idempotencyKey: dto.idempotencyKey,
        correlationId: dto.correlationId,
        contentLocale: target.contentLocale,
        publicationType: target.publicationType,
        title: target.title,
        parentJobId: target.generationJobId,
        draft: { markdown: target.markdown, citations: target.citations },
      });
      await this.passes.complete(passId, {
        status:
          reply.status === 'FORMATTED' ? FormatPassStatus.FORMATTED : FormatPassStatus.SKIPPED,
        code: reply.code,
        markdown: reply.markdown,
      });
      return {
        revisionId: target.revisionId,
        originalMarkdown: target.markdown,
        contentLocale: target.contentLocale,
        status: reply.status,
        code: reply.code,
        markdown: reply.markdown,
        citations: reply.citations,
        remainingToday: await this.remaining(publicationId),
      };
    } catch (error: unknown) {
      // A failed pass does not use up a day's pass (the count ignores FAILED); a retry needs a new key.
      await this.passes.complete(passId, {
        status: FormatPassStatus.FAILED,
        code: null,
        markdown: null,
      });
      throw error;
    }
  }

  private async unchanged(
    publicationId: string,
    target: FormatTarget,
    code: string | null,
  ): Promise<ThreadFormatPreview> {
    return {
      revisionId: target.revisionId,
      originalMarkdown: target.markdown,
      contentLocale: target.contentLocale,
      status: 'SKIPPED',
      code: code ?? FORMAT_ALREADY_PRETTY_CODE,
      markdown: target.markdown,
      citations: target.citations,
      remainingToday: await this.remaining(publicationId),
    };
  }

  private async remaining(publicationId: string): Promise<number> {
    return Math.max(0, FORMAT_PASSES_PER_DAY - (await this.passes.countToday(publicationId)));
  }
}
