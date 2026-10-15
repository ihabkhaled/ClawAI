import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { resolvePublicationTitle } from '../../publications/utilities/publication-readable-title.utility';
import { latestRevisionContentSchema } from '../../publications/schemas/latest-revision-content.schema';
import {
  FORMAT_ALREADY_PRETTY_CODE,
  FORMAT_ATTEMPTS_PER_DAY,
  FORMAT_PASSES_PER_DAY,
  FORMAT_WINDOW_MS,
} from '../constants/publication-format.constants';
import { citationsSchema, PASS_SELECT } from '../constants/format-pass-select.constants';
import { FormatPassStatus } from '../enums/format-pass-status.enum';
import type { FormatPassReservation, FormatTarget } from '../types/publication-format.types';

@Injectable()
export class FormatPassRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The newest revision of a Thread this owner owns; null for a missing or someone else's Thread. */
  async findOwnedTarget(publicationId: string, ownerId: string): Promise<FormatTarget | null> {
    const revision = await this.prisma.threadPublicationRevision.findFirst({
      where: { publicationId, publication: { ownerId } },
      orderBy: { revision: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        publication: {
          select: { generationJobId: true, contentLocale: true, publicationType: true },
        },
      },
    });
    const content = revision ? latestRevisionContentSchema.safeParse(revision.content) : null;
    if (!revision || !content?.success) return null;
    return {
      revisionId: revision.id,
      title: resolvePublicationTitle(revision.title, revision.content),
      markdown: content.data.markdown,
      citations: citationsSchema.parse(content.data.citations),
      generationJobId: revision.publication.generationJobId,
      contentLocale: revision.publication.contentLocale,
      publicationType: revision.publication.publicationType,
    };
  }

  /**
   * Takes the next pass under a per-Thread advisory lock, so two clicks cannot both read "2 used"
   * and both run. A key this owner already used returns its row unchanged (an idempotent replay).
   */
  reserve(input: {
    publicationId: string;
    ownerId: string;
    revisionId: string;
    idempotencyKey: string;
  }): Promise<FormatPassReservation> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.publicationId}))`;
      const replay = await transaction.threadFormatPass.findUnique({
        where: {
          ownerId_idempotencyKey: { ownerId: input.ownerId, idempotencyKey: input.idempotencyKey },
        },
        select: { ...PASS_SELECT, publicationId: true },
      });
      if (replay) {
        return replay.publicationId === input.publicationId
          ? ({ outcome: 'REPLAY', pass: replay } as const)
          : ({ outcome: 'LIMIT', used: FORMAT_PASSES_PER_DAY } as const);
      }
      const used = await this.countOn(transaction, input.publicationId);
      if (used >= FORMAT_PASSES_PER_DAY) return { outcome: 'LIMIT', used } as const;
      // Skipped passes are free for the owner but still cost a model call, so they are bounded too.
      const attempts = await this.countAttemptsOn(transaction, input.publicationId);
      if (attempts >= FORMAT_ATTEMPTS_PER_DAY) return { outcome: 'LIMIT', used: attempts } as const;
      const pass = await transaction.threadFormatPass.create({
        data: {
          publicationId: input.publicationId,
          ownerId: input.ownerId,
          revisionId: input.revisionId,
          idempotencyKey: input.idempotencyKey,
          status: FormatPassStatus.PENDING,
        },
        select: PASS_SELECT,
      });
      return { outcome: 'RESERVED', pass } as const;
    });
  }

  async complete(
    passId: string,
    result: { status: FormatPassStatus; code: string | null; markdown: string | null },
  ): Promise<void> {
    await this.prisma.threadFormatPass.updateMany({
      where: { id: passId, status: FormatPassStatus.PENDING },
      data: { status: result.status, code: result.code, resultMarkdown: result.markdown },
    });
  }

  /** Passes that count against today's limit: only ones that produced a formatted article (ADR-189). */
  countToday(publicationId: string): Promise<number> {
    return this.countOn(this.prisma, publicationId);
  }

  private countOn(
    client: Pick<PrismaService, 'threadFormatPass'> | Prisma.TransactionClient,
    publicationId: string,
  ): Promise<number> {
    return client.threadFormatPass.count({
      where: {
        publicationId,
        createdAt: { gte: new Date(Date.now() - FORMAT_WINDOW_MS) },
        status: FormatPassStatus.FORMATTED,
      },
    });
  }

  /** Every pass that reached the model today (formatted or skipped), but not failed or already-typeset ones. */
  private countAttemptsOn(
    client: Pick<PrismaService, 'threadFormatPass'> | Prisma.TransactionClient,
    publicationId: string,
  ): Promise<number> {
    return client.threadFormatPass.count({
      where: {
        publicationId,
        createdAt: { gte: new Date(Date.now() - FORMAT_WINDOW_MS) },
        status: { in: [FormatPassStatus.FORMATTED, FormatPassStatus.SKIPPED] },
        OR: [{ code: null }, { code: { not: FORMAT_ALREADY_PRETTY_CODE } }],
      },
    });
  }
}
