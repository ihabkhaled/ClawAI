import { Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { assertSafeRequestUrl } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { EMBEDDING_HTTP_TIMEOUT_MS } from '../constants/embeddings.constants';
import { CIRCUIT_OLLAMA_EMBEDDINGS } from '../../../common/constants';
import { throughCircuit } from '../../../common/utilities';

const logger = new Logger('OllamaEmbeddings');

/**
 * Stream 30 — wrapper around Ollama's `/api/embeddings` endpoint. Used by
 * EmbeddingsService for both upsert (workspace objects) and search (query
 * vectors). NEVER inline.
 */
export async function fetchEmbedding(input: { content: string }): Promise<number[]> {
  // Fail instantly while the backend is known to be down. Callers already treat
  // a throw as "no semantic results, carry on"; this only changes how long they
  // wait to learn it. See dependency-circuit.utility.ts for the measurement.
  return throughCircuit(CIRCUIT_OLLAMA_EMBEDDINGS, async () => requestEmbedding(input));
}

async function requestEmbedding(input: { content: string }): Promise<number[]> {
  const config = AppConfig.get();
  const url = `${config.OLLAMA_BASE_URL}/api/embeddings`;
  // This reaches fetch without going through the shared http client, so the
  // guard is applied here instead (CodeQL js/request-forgery, alert #58).
  // OLLAMA_BASE_URL ends in one of the recognised suffixes, so its host is
  // already on the environment allowlist — nothing extra to declare.
  const safeUrl = assertSafeRequestUrl(url);
  const response = await fetch(safeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ model: config.EMBEDDING_MODEL, prompt: input.content }),
    signal: AbortSignal.timeout(EMBEDDING_HTTP_TIMEOUT_MS),
    // A service call is never legitimately redirected, and following one is
    // how an allowlisted host becomes a hostile one (alert #58).
    redirect: 'error',
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
