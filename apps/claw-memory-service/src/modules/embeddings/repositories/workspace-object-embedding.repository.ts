import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { EmbeddingRow, SearchResultRow } from '../types/embeddings.types';

/**
 * Stream 30 — Prisma repository for `WorkspaceObjectEmbedding`.
 *
 * Vector operations use raw SQL because Prisma's migrate engine treats `vector`
 * as `Unsupported<...>` and the cosine-distance operator (`<=>`) is not in the
 * Prisma query API. Each method parameterises inputs to defeat injection.
 */
@Injectable()
export class WorkspaceObjectEmbeddingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: {
    workspaceObjectId: string;
    userId: string;
    provider: string;
    objectType: string;
    contentHash: string;
    contentSnippet: string;
    embedding: number[];
  }): Promise<void> {
    const vectorLiteral = this.toVectorLiteral(input.embedding);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "workspace_object_embeddings"
        ("id","workspace_object_id","user_id","provider","object_type","content_hash","content_snippet","embedding","created_at","updated_at")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::vector, NOW(), NOW())
       ON CONFLICT ("workspace_object_id", "content_hash")
         DO UPDATE SET
           "user_id" = EXCLUDED."user_id",
           "provider" = EXCLUDED."provider",
           "object_type" = EXCLUDED."object_type",
           "content_snippet" = EXCLUDED."content_snippet",
           "embedding" = EXCLUDED."embedding",
           "updated_at" = NOW()`,
      input.workspaceObjectId,
      input.userId,
      input.provider,
      input.objectType,
      input.contentHash,
      input.contentSnippet,
      vectorLiteral,
    );
  }

  async findExistingHash(
    workspaceObjectId: string,
    contentHash: string,
  ): Promise<EmbeddingRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<EmbeddingRow[]>(
      `SELECT
         "id",
         "workspace_object_id" as "workspaceObjectId",
         "user_id" as "userId",
         "provider",
         "object_type" as "objectType",
         "content_hash" as "contentHash",
         "content_snippet" as "contentSnippet",
         "created_at" as "createdAt",
         "updated_at" as "updatedAt"
       FROM "workspace_object_embeddings"
       WHERE "workspace_object_id" = $1 AND "content_hash" = $2
       LIMIT 1`,
      workspaceObjectId,
      contentHash,
    );
    return rows[0] ?? null;
  }

  async deleteByObjectId(workspaceObjectId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "workspace_object_embeddings" WHERE "workspace_object_id" = $1`,
      workspaceObjectId,
    );
  }

  /**
   * Cosine-similarity search over a user's embeddings. `score` is
   * `1 - cosine_distance` so higher is more similar (range 0..1).
   */
  async cosineSearch(input: {
    userId: string;
    queryVector: number[];
    topK: number;
    providers?: string[];
  }): Promise<SearchResultRow[]> {
    const vectorLiteral = this.toVectorLiteral(input.queryVector);
    if (input.providers !== undefined && input.providers.length > 0) {
      const placeholders = input.providers.map((_, i) => `$${String(i + 4)}`).join(',');
      const rows = await this.prisma.$queryRawUnsafe<SearchResultRow[]>(
        `SELECT
           "workspace_object_id" as "workspaceObjectId",
           "provider",
           "object_type" as "objectType",
           "content_snippet" as "contentSnippet",
           1 - ("embedding" <=> $1::vector) as "score"
         FROM "workspace_object_embeddings"
         WHERE "user_id" = $2
           AND "provider" IN (${placeholders})
         ORDER BY "embedding" <=> $1::vector
         LIMIT $3`,
        vectorLiteral,
        input.userId,
        input.topK,
        ...input.providers,
      );
      return rows;
    }
    const rows = await this.prisma.$queryRawUnsafe<SearchResultRow[]>(
      `SELECT
         "workspace_object_id" as "workspaceObjectId",
         "provider",
         "object_type" as "objectType",
         "content_snippet" as "contentSnippet",
         1 - ("embedding" <=> $1::vector) as "score"
       FROM "workspace_object_embeddings"
       WHERE "user_id" = $2
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      input.userId,
      input.topK,
    );
    return rows;
  }

  private toVectorLiteral(vector: number[]): string {
    // pgvector's text input format: '[0.1,0.2,0.3]'
    return `[${vector.map((n) => n.toString()).join(',')}]`;
  }
}
