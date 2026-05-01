import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  EMBEDDING_CONTENT_MAX_CHARS,
  EMBEDDING_DEFAULT_TOP_K,
  EMBEDDING_SNIPPET_MAX_CHARS,
} from '../constants/embeddings.constants';
import { WorkspaceObjectEmbeddingRepository } from '../repositories/workspace-object-embedding.repository';
import type {
  SearchResponse,
  SearchWorkspaceObjectsInput,
  UpsertWorkspaceObjectEmbeddingInput,
} from '../types/embeddings.types';
import { fetchEmbedding, hashContent } from '../utilities/ollama-embeddings.utility';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(private readonly repo: WorkspaceObjectEmbeddingRepository) {}

  async upsert(input: UpsertWorkspaceObjectEmbeddingInput): Promise<{ created: boolean }> {
    this.logger.debug(
      `upsert: workspaceObjectId=${input.workspaceObjectId} provider=${input.provider}`,
    );
    const truncated = input.content.slice(0, EMBEDDING_CONTENT_MAX_CHARS);
    const contentHash = hashContent(truncated);
    const existing = await this.repo.findExistingHash(input.workspaceObjectId, contentHash);
    if (existing !== null) {
      this.logger.debug(
        `upsert: hash already present — workspaceObjectId=${input.workspaceObjectId}`,
      );
      return { created: false };
    }
    const embedding = await fetchEmbedding({ content: truncated });
    await this.repo.upsert({
      workspaceObjectId: input.workspaceObjectId,
      userId: input.userId,
      provider: input.provider,
      objectType: input.objectType,
      contentHash,
      contentSnippet: truncated.slice(0, EMBEDDING_SNIPPET_MAX_CHARS),
      embedding,
    });
    this.logger.log(
      `upsert: persisted embedding for workspaceObjectId=${input.workspaceObjectId} provider=${input.provider}`,
    );
    return { created: true };
  }

  async search(input: SearchWorkspaceObjectsInput): Promise<SearchResponse> {
    const config = AppConfig.get();
    const topK = Math.max(1, Math.min(config.SEARCH_TOP_K, input.topK ?? EMBEDDING_DEFAULT_TOP_K));
    this.logger.debug(`search: userId=${input.userId} topK=${String(topK)} queryLen=${String(input.query.length)}`);
    const queryVector = await fetchEmbedding({
      content: input.query.slice(0, EMBEDDING_CONTENT_MAX_CHARS),
    });
    const hits = await this.repo.cosineSearch({
      userId: input.userId,
      queryVector,
      topK,
      providers: input.providers,
    });
    return {
      hits: hits.map((row) => ({
        workspaceObjectId: row.workspaceObjectId,
        provider: row.provider,
        objectType: row.objectType,
        contentSnippet: row.contentSnippet,
        score: Number(row.score),
      })),
      topK,
      embeddingModel: config.EMBEDDING_MODEL,
    };
  }

  async deleteByObjectId(workspaceObjectId: string): Promise<void> {
    this.logger.log(`deleteByObjectId: ${workspaceObjectId}`);
    await this.repo.deleteByObjectId(workspaceObjectId);
  }
}
