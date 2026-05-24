import { Injectable, Logger } from '@nestjs/common';
import { fetchEmbedding } from '../../embeddings/utilities/ollama-embeddings.utility';
import { ContextPacksRepository } from '../repositories/context-packs.repository';
import type { ContextPackItemEmbeddingHit } from '../types/context-pack-embedding.types';

/**
 * Context V2 (ADR-036) — wraps nomic-embed-text for pack items. Same
 * fail-soft contract as MemoryEmbeddingManager: persistence keeps embedding
 * NULL when the model is unavailable so the rest of the flow does not block.
 */
@Injectable()
export class ContextPackEmbeddingManager {
  private readonly logger = new Logger(ContextPackEmbeddingManager.name);

  constructor(private readonly repo: ContextPacksRepository) {}

  async embedItem(itemId: string, content: string): Promise<boolean> {
    if (content.trim().length === 0) {
      return false;
    }
    try {
      const vector = await fetchEmbedding({ content: content.slice(0, 4096) });
      await this.repo.upsertItemEmbedding(itemId, vector);
      this.logger.log(`embedItem: persisted vector for itemId=${itemId}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`embedItem: failed (non-blocking) — itemId=${itemId} reason=${msg}`);
      return false;
    }
  }

  async searchItems(
    packIds: string[],
    query: string,
    topK: number,
  ): Promise<ContextPackItemEmbeddingHit[]> {
    if (packIds.length === 0 || query.trim().length === 0) {
      return [];
    }
    try {
      const vector = await fetchEmbedding({ content: query.slice(0, 4096) });
      return await this.repo.cosineSearchItems(packIds, vector, topK);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`searchItems: failed (non-blocking) — reason=${msg}`);
      return [];
    }
  }
}
