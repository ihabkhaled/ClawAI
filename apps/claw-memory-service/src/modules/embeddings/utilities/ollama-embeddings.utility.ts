import { Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { AppConfig } from '../../../app/config/app.config';
import { EMBEDDING_HTTP_TIMEOUT_MS } from '../constants/embeddings.constants';
import {
  embeddingCircuitRemainingMs,
  isEmbeddingCircuitOpen,
  recordEmbeddingFailure,
  recordEmbeddingSuccess,
} from './embedding-circuit.utility';

const logger = new Logger('OllamaEmbeddings');

/**
 * Stream 30 — wrapper around Ollama's `/api/embeddings` endpoint. Used by
 * EmbeddingsService for both upsert (workspace objects) and search (query
 * vectors). NEVER inline.
 */
export async function fetchEmbedding(input: { content: string }): Promise<number[]> {
  // Fail instantly while the backend is known to be down. Callers already treat
  // a throw as "no semantic results, carry on"; this only changes how long they
  // wait to learn it. See embedding-circuit.utility.ts for the measurement.
  if (isEmbeddingCircuitOpen()) {
    throw new Error(
      `Ollama embeddings unavailable — circuit open for another ${String(
        Math.ceil(embeddingCircuitRemainingMs() / 1000),
      )}s`,
    );
  }
  try {
    const vector = await requestEmbedding(input);
    recordEmbeddingSuccess();
    return vector;
  } catch (error) {
    recordEmbeddingFailure();
    throw error;
  }
}

async function requestEmbedding(input: { content: string }): Promise<number[]> {
  const config = AppConfig.get();
  const url = `${config.OLLAMA_BASE_URL}/api/embeddings`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ model: config.EMBEDDING_MODEL, prompt: input.content }),
    signal: AbortSignal.timeout(EMBEDDING_HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama embeddings ${String(response.status)}: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Ollama embeddings returned empty vector');
  }
  if (data.embedding.length !== config.EMBEDDING_DIMENSIONS) {
    logger.warn(
      `fetchEmbedding: dimension mismatch — got ${String(data.embedding.length)}, expected ${String(config.EMBEDDING_DIMENSIONS)}`,
    );
  }
  return data.embedding;
}

/**
 * SHA-256 content hash used for dedup. Strips leading/trailing whitespace and
 * collapses inner runs so that whitespace-only changes don't trigger a re-embed.
 */
export function hashContent(content: string): string {
  const normalized = content.replaceAll(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
