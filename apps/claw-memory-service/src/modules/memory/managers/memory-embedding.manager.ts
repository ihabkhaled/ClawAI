import { Injectable, Logger } from '@nestjs/common';
import { MemoryRepository } from '../repositories/memory.repository';
import { fetchEmbedding } from '../../embeddings/utilities/ollama-embeddings.utility';
import type {
  MemoryEmbeddingSearchResult,
  ScopedRetrievalFilter,
} from '../types/memory-embedding.types';

/**
 * Memory V2 (ADR-034) — wraps the existing nomic-embed-text Ollama call to
 * upsert + cosine-search memory embeddings. Embeds opportunistically: if the
 * model is unavailable, the catch path leaves embedding=NULL and the
 * retrieval layer falls back to lexical scoring.
 */
@Injectable()
export class MemoryEmbeddingManager {
  private readonly logger = new Logger(MemoryEmbeddingManager.name);

  constructor(private readonly memoryRepo: MemoryRepository) {}

  async embedOne(memoryId: string, content: string): Promise<boolean> {
    if (content.trim().length === 0) {
      return false;
    }
    try {
      this.logger.debug(`embedOne: memoryId=${memoryId} contentLen=${String(content.length)}`);
      const vector = await fetchEmbedding({ content: content.slice(0, 4096) });
      await this.memoryRepo.upsertEmbedding(memoryId, vector);
      this.logger.log(`embedOne: persisted vector for memoryId=${memoryId}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`embedOne: failed (non-blocking) — memoryId=${memoryId} reason=${msg}`);
      return false;
    }
  }

  async search(
    filter: ScopedRetrievalFilter,
    query: string,
    topK: number,
  ): Promise<MemoryEmbeddingSearchResult[]> {
    if (query.trim().length === 0) {
      return [];
    }
    try {
      this.logger.debug(
        `search: userId=${filter.userId} topK=${String(topK)} queryLen=${String(query.length)}`,
      );
      const vector = await fetchEmbedding({ content: query.slice(0, 4096) });
      return await this.memoryRepo.cosineSearch(filter, vector, topK);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`search: failed (non-blocking) — reason=${msg}`);
      return [];
    }
  }
}
