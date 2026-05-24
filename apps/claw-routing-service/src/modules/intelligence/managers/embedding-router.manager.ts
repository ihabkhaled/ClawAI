// SCAFFOLD: stream R.8.9.7 (09-r8-advanced-intelligence) — pick embedding-specific model

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingRouterManager {
  private readonly logger = new Logger(EmbeddingRouterManager.name);

  apply(_input: unknown): unknown {
    this.logger.warn('EmbeddingRouterManager.apply: SCAFFOLD only');
    throw new Error('SCAFFOLD-R8.9.7 — EmbeddingRouterManager.apply not implemented; see docs/15-ai-context/routing-flagship-streams/09-r8-advanced-intelligence.md');
  }
}
