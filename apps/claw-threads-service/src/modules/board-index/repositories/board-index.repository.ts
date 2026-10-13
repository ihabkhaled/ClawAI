import { Injectable } from '@nestjs/common';

import {
  Prisma,
  PublicationCommentStatus,
  PublicationReactionValue,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  BOARD_CONTENT_SCHEMA,
  BOARD_VISIBLE_PUBLICATION,
  BOARD_VISIBLE_REVISION,
} from '../constants/board-index.constants';
import type {
  BoardChangedPublication,
  BoardIndexDoc,
  BoardIndexSource,
  BoardIndexStore,
  BoardReconcileCursor,
} from '../types/board-index.types';

@Injectable()
export class BoardIndexRepository implements BoardIndexStore {
  constructor(private readonly prisma: PrismaService) {}

  /** The publication's current visible revision with its counts, or null when it is not visible. */
  async loadVisibleSource(publicationId: string): Promise<BoardIndexSource | null> {
    const publication = await this.prisma.threadPublication.findFirst({
      where: { id: publicationId, ...BOARD_VISIBLE_PUBLICATION },
      select: {
        id: true,
        slug: true,
        contentLocale: true,
        publicationType: true,
        publishedAt: true,
        viewCount: true,
        revisions: {
          where: BOARD_VISIBLE_REVISION,
          orderBy: { revision: 'desc' },
          take: 1,
          select: { title: true, content: true },
        },
      },
    });
    const revision = publication?.revisions[0];
    const content = BOARD_CONTENT_SCHEMA.safeParse(revision?.content);
    if (!publication?.publishedAt || !revision || !content.success) return null;
    const [likeCount, dislikeCount, commentCount] = await Promise.all([
      this.prisma.threadPublicationReaction.count({
        where: { publicationId, value: PublicationReactionValue.LIKE },
      }),
      this.prisma.threadPublicationReaction.count({
        where: { publicationId, value: PublicationReactionValue.DISLIKE },
      }),
      this.prisma.threadPublicationComment.count({
        where: { publicationId, status: PublicationCommentStatus.VISIBLE },
      }),
    ]);
    return {
      publicationId: publication.id,
      slug: publication.slug,
      contentLocale: publication.contentLocale,
      publicationType: publication.publicationType,
      publishedAt: publication.publishedAt,
      viewCount: publication.viewCount,
      title: revision.title,
      markdown: content.data.markdown,
      sourceCount: content.data.citations.length,
      likeCount,
      dislikeCount,
      commentCount,
    };
  }

  /** The publication id behind a public slug, or null for an unknown slug. */
  async findIdBySlug(slug: string): Promise<string | null> {
    const row = await this.prisma.threadPublication.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /**
   * The vector holds the exact words ('simple', what queries are parsed with) and the locale's stems,
   * so both `qubits` and `qubit` find an English article that says `qubits`.
   */
  async upsertDoc(doc: BoardIndexDoc): Promise<void> {
    const searchable = `${doc.titleNorm} ${doc.bodyNorm}`;
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO thread_publication_search_docs (
        publication_id, slug, content_locale, publication_type, title, excerpt, title_norm, body_norm,
        reading_minutes, source_count, like_count, dislike_count, comment_count, view_count,
        published_at, tsv, updated_at
      ) VALUES (
        ${doc.publicationId}, ${doc.slug}, ${doc.contentLocale}, ${doc.publicationType}, ${doc.title},
        ${doc.excerpt}, ${doc.titleNorm}, ${doc.bodyNorm}, ${doc.readingMinutes}, ${doc.sourceCount},
        ${doc.likeCount}, ${doc.dislikeCount}, ${doc.commentCount}, ${doc.viewCount}, ${doc.publishedAt},
        setweight(to_tsvector('simple'::regconfig, ${doc.titleNorm}), 'A') ||
          setweight(to_tsvector(${doc.textSearchConfig}::regconfig, ${doc.titleNorm}), 'A') ||
          setweight(to_tsvector('simple'::regconfig, ${searchable}), 'B') ||
          setweight(to_tsvector(${doc.textSearchConfig}::regconfig, ${searchable}), 'B'),
        now()
      )
      ON CONFLICT (publication_id) DO UPDATE SET
        slug = EXCLUDED.slug, content_locale = EXCLUDED.content_locale,
        publication_type = EXCLUDED.publication_type, title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
        title_norm = EXCLUDED.title_norm, body_norm = EXCLUDED.body_norm,
        reading_minutes = EXCLUDED.reading_minutes, source_count = EXCLUDED.source_count,
        like_count = EXCLUDED.like_count, dislike_count = EXCLUDED.dislike_count,
        comment_count = EXCLUDED.comment_count, view_count = EXCLUDED.view_count,
        published_at = EXCLUDED.published_at, tsv = EXCLUDED.tsv, updated_at = now()
    `);
  }

  async deleteDoc(publicationId: string): Promise<boolean> {
    const removed = await this.prisma.threadPublicationSearchDoc.deleteMany({
      where: { publicationId },
    });
    return removed.count > 0;
  }

  /** Visible publications changed after the cursor, oldest first (keyset on updatedAt, id). */
  async findChangedSince(
    cursor: BoardReconcileCursor,
    limit: number,
  ): Promise<BoardChangedPublication[]> {
    return this.prisma.threadPublication.findMany({
      where: {
        ...BOARD_VISIBLE_PUBLICATION,
        OR: [
          { updatedAt: { gt: cursor.updatedAt } },
          { updatedAt: cursor.updatedAt, id: { gt: cursor.id } },
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, updatedAt: true },
    });
  }

  /** Index rows not refreshed since `before`, oldest first, so counters never stay stale. */
  async findStaleDocIds(before: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.threadPublicationSearchDoc.findMany({
      where: { updatedAt: { lt: before } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
      select: { publicationId: true },
    });
    return rows.map((row) => row.publicationId);
  }

  /** Index rows whose publication no longer passes the visibility predicate. */
  async findInvisibleDocIds(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ publication_id: string }[]>(Prisma.sql`
      SELECT d.publication_id FROM thread_publication_search_docs d
      JOIN thread_publications p ON p.id = d.publication_id
      WHERE p.status <> 'PUBLISHED'
         OR NOT EXISTS (
           SELECT 1 FROM thread_publication_revisions r
           WHERE r.publication_id = p.id AND r.review_status = 'OWNER_APPROVED'
             AND r.safety_status = 'APPROVED' AND r.index_eligible = true)
      LIMIT ${limit}
    `);
    return rows.map((row) => row.publication_id);
  }
}
