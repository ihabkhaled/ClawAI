import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Locale } from '@claw/shared-types';

import { Prisma, PublicationStatus, TranslationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PUBLIC_REVISION_WHERE } from '../../publications/constants/public-revision.constants';
import { resolveCitationMarkers } from '../../publications/utilities/citation-marker.utility';
import { resolvePublicationTitle } from '../../publications/utilities/publication-readable-title.utility';
import {
  TRANSLATION_LEASE_SECONDS,
  TRANSLATION_MAX_ATTEMPTS,
  TRANSLATION_RETRY_BACKOFF_SECONDS,
  TRANSLATION_TARGET_LOCALES,
} from '../constants/publication-translation.constants';
import { translationSourceContentSchema } from '../schemas/translation-source-content.schema';
import type {
  DueTranslationRow,
  ReadyTranslation,
  TranslatedSitemapItem,
  TranslationSource,
  TranslationTarget,
} from '../types/publication-translation.types';

/** The translation copies of published Threads: what is due, who works on it, what readers get. */
@Injectable()
export class PublicationTranslationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pairs of (published Thread, language) with no current translation: never made, made for an
   * older revision, failed and past its back-off, or running past its lease. Oldest first.
   */
  async findDue(limit: number): Promise<TranslationTarget[]> {
    const rows = await this.prisma.$queryRaw<DueTranslationRow[]>(Prisma.sql`
      SELECT p.id AS "publicationId", l.locale AS "locale",
             p.content_locale AS "sourceLocale", r.revision AS "revision"
      FROM thread_publications p
      JOIN LATERAL (
        SELECT revision FROM thread_publication_revisions
        WHERE publication_id = p.id
          AND review_status = ${PUBLIC_REVISION_WHERE.reviewStatus}::"RevisionReviewStatus"
          AND safety_status = ${PUBLIC_REVISION_WHERE.safetyStatus}::"PublicationSafetyStatus"
          AND index_eligible = true
        ORDER BY revision DESC LIMIT 1
      ) r ON true
      CROSS JOIN unnest(${[...TRANSLATION_TARGET_LOCALES]}::text[]) AS l(locale)
      LEFT JOIN thread_publication_translations t
        ON t.publication_id = p.id AND t.locale = l.locale
      WHERE p.status = ${PublicationStatus.PUBLISHED}::"PublicationStatus"
        AND p.published_at IS NOT NULL
        AND l.locale <> p.content_locale
        AND (
          t.id IS NULL
          OR t.status = 'PENDING'
          OR (t.source_revision <> r.revision AND t.status <> 'RUNNING')
          OR (t.status = 'FAILED' AND t.source_revision = r.revision
              AND t.attempts < ${TRANSLATION_MAX_ATTEMPTS}
              AND t.updated_at < now() - make_interval(secs => ${TRANSLATION_RETRY_BACKOFF_SECONDS} * GREATEST(t.attempts, 1)))
          OR (t.status = 'RUNNING'
              AND t.updated_at < now() - make_interval(secs => ${TRANSLATION_LEASE_SECONDS}))
        )
      ORDER BY p.published_at ASC, l.locale ASC
      LIMIT ${limit}
    `);
    return rows.map((row) => ({
      publicationId: row.publicationId,
      locale: row.locale as Locale,
      sourceLocale: row.sourceLocale as Locale,
      revision: row.revision,
    }));
  }

  /**
   * Takes the row for this pair, or answers null when another worker holds it or it is already
   * current. A new revision restarts the attempt count; a retry of the same one adds to it.
   */
  async claim(target: TranslationTarget): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO thread_publication_translations
        (id, publication_id, locale, source_revision, status, attempts, started_at, created_at, updated_at)
      VALUES (${randomUUID()}, ${target.publicationId}, ${target.locale}, ${target.revision},
              'RUNNING', 1, now(), now(), now())
      ON CONFLICT (publication_id, locale) DO UPDATE SET
        status = 'RUNNING',
        started_at = now(),
        updated_at = now(),
        failure_code = NULL,
        attempts = CASE WHEN thread_publication_translations.source_revision = EXCLUDED.source_revision
                        THEN thread_publication_translations.attempts + 1 ELSE 1 END,
        source_revision = EXCLUDED.source_revision
      WHERE NOT (thread_publication_translations.status = 'READY'
                 AND thread_publication_translations.source_revision = EXCLUDED.source_revision)
        AND (thread_publication_translations.status <> 'RUNNING'
             OR thread_publication_translations.updated_at
                < now() - make_interval(secs => ${TRANSLATION_LEASE_SECONDS}))
      RETURNING id
    `);
    return rows[0]?.id ?? null;
  }

  /** The served revision's title and text, citation markers resolved as readers see them. */
  async loadSource(publicationId: string, revision: number): Promise<TranslationSource | null> {
    const row = await this.prisma.threadPublicationRevision.findFirst({
      where: {
        publicationId,
        revision,
        ...PUBLIC_REVISION_WHERE,
        publication: { status: PublicationStatus.PUBLISHED },
      },
      select: { title: true, content: true },
    });
    const content = translationSourceContentSchema.safeParse(row?.content);
    if (!row || !content.success) return null;
    return {
      title: resolvePublicationTitle(row.title, row.content),
      markdown: resolveCitationMarkers(
        content.data.markdown,
        content.data.citations.map(({ url, evidenceId }) => ({
          url,
          evidenceId: evidenceId ?? '',
        })),
      ),
    };
  }

  async complete(
    id: string,
    revision: number,
    result: { title: string; markdown: string; model: string },
  ): Promise<boolean> {
    const updated = await this.prisma.threadPublicationTranslation.updateMany({
      where: { id, sourceRevision: revision, status: TranslationStatus.RUNNING },
      data: {
        status: TranslationStatus.READY,
        title: result.title,
        markdown: result.markdown,
        model: result.model,
        failureCode: null,
        translatedAt: new Date(),
      },
    });
    return updated.count === 1;
  }

  async fail(id: string, revision: number, code: string): Promise<void> {
    await this.prisma.threadPublicationTranslation.updateMany({
      where: { id, sourceRevision: revision, status: TranslationStatus.RUNNING },
      data: { status: TranslationStatus.FAILED, failureCode: code.slice(0, 64) },
    });
  }

  /** Languages with a current copy for this revision. */
  async listReadyLocales(publicationId: string, revision: number): Promise<Locale[]> {
    const rows = await this.prisma.threadPublicationTranslation.findMany({
      where: { publicationId, sourceRevision: revision, status: TranslationStatus.READY },
      select: { locale: true },
      orderBy: { locale: 'asc' },
    });
    return rows.map((row) => row.locale as Locale);
  }

  async findReady(
    publicationId: string,
    locale: Locale,
    revision: number,
  ): Promise<ReadyTranslation | null> {
    const row = await this.prisma.threadPublicationTranslation.findFirst({
      where: { publicationId, locale, sourceRevision: revision, status: TranslationStatus.READY },
      select: { title: true, markdown: true },
    });
    return row?.title && row.markdown ? { title: row.title, markdown: row.markdown } : null;
  }

  /** Translated pages of one language that search engines may crawl: current, public, published. */
  async countTranslatedSitemap(locale: Locale): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT count(*) AS total ${this.sitemapFrom(locale)}
    `);
    return Number(rows[0]?.total ?? 0);
  }

  async listTranslatedSitemap(
    locale: Locale,
    skip: number,
    take: number,
  ): Promise<TranslatedSitemapItem[]> {
    const rows = await this.prisma.$queryRaw<{ slug: string; translatedAt: Date }[]>(Prisma.sql`
      SELECT p.slug AS "slug", t.translated_at AS "translatedAt" ${this.sitemapFrom(locale)}
      ORDER BY p.published_at DESC, p.slug DESC
      OFFSET ${skip} LIMIT ${take}
    `);
    return rows;
  }

  private sitemapFrom(locale: Locale): Prisma.Sql {
    return Prisma.sql`
      FROM thread_publication_translations t
      JOIN thread_publications p ON p.id = t.publication_id
      JOIN LATERAL (
        SELECT revision FROM thread_publication_revisions
        WHERE publication_id = p.id
          AND review_status = ${PUBLIC_REVISION_WHERE.reviewStatus}::"RevisionReviewStatus"
          AND safety_status = ${PUBLIC_REVISION_WHERE.safetyStatus}::"PublicationSafetyStatus"
          AND index_eligible = true
        ORDER BY revision DESC LIMIT 1
      ) r ON r.revision = t.source_revision
      WHERE t.locale = ${locale} AND t.status = 'READY'
        AND p.status = ${PublicationStatus.PUBLISHED}::"PublicationStatus"
        AND p.published_at IS NOT NULL
    `;
  }
}
