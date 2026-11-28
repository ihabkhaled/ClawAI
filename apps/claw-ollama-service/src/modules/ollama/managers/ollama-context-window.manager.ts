import { Injectable, Logger } from '@nestjs/common';
import { RuntimeType } from '../../../generated/prisma';
import {
  OLLAMA_SHOW_CACHE_TTL_MS,
  OLLAMA_SHOW_CONCURRENCY,
  OLLAMA_SHOW_FAILURE_RETRY_MS,
  OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC,
  OLLAMA_SHOW_SYNC_BUDGET_MS,
  OLLAMA_SHOW_TIMEOUT_MS,
} from '../constants/ollama-show.constants';
import {
  type OllamaContextWindowCacheEntry,
  type OllamaContextWindowLookup,
} from '../types/ollama-context-window.types';
import { mapWithConcurrency } from '../utilities/bounded-concurrency.utility';
import { parseOllamaContextLength } from '../utilities/ollama-context-length.utility';
import { getRuntimeAdapter } from './adapters/runtime-adapter-factory';

/**
 * The context window of each installed Ollama model, read from Ollama itself
 * (ADR-234).
 *
 * The routing snapshot used to carry no window for an Ollama model, so the model
 * picker showed a size and no context beside a local model. Ollama states the
 * window the model was trained for in `POST /api/show` (`model_info`
 * `<arch>.context_length`).
 *
 * Bounded, because the snapshot asks for every installed model: at most
 * OLLAMA_SHOW_CONCURRENCY calls in flight, OLLAMA_SHOW_TIMEOUT_MS per call, at
 * most OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC calls and an overall
 * OLLAMA_SHOW_SYNC_BUDGET_MS. An answer is remembered for a day, a failure or a
 * missing key for an hour (and a window read earlier is kept through a failure). It
 * never throws and never invents: a model whose
 * window could not be read is simply absent from the result, which the caller
 * forwards as "unknown".
 */
@Injectable()
export class OllamaContextWindowManager {
  private readonly logger = new Logger(OllamaContextWindowManager.name);
  private readonly cache = new Map<string, OllamaContextWindowCacheEntry>();

  /** `name:tag` -> window in tokens, for the models whose window is known. */
  async resolve(modelNames: readonly string[]): Promise<Map<string, number>> {
    const now = Date.now();
    const deadline = now + OLLAMA_SHOW_SYNC_BUDGET_MS;
    const wanted = new Set(modelNames);
    this.forgetUninstalled(wanted);

    const windows = new Map<string, number>();
    const pending: string[] = [];
    for (const modelName of wanted) {
      const cached = this.cache.get(modelName);
      if (cached === undefined || cached.expiresAt <= now) {
        pending.push(modelName);
      } else if (cached.tokens !== undefined) {
        windows.set(modelName, cached.tokens);
      }
    }

    const toLookUp = pending.slice(0, OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC);
    const lookups = await mapWithConcurrency(toLookUp, OLLAMA_SHOW_CONCURRENCY, (modelName) =>
      this.lookUp(modelName, deadline),
    );
    for (const lookup of lookups) {
      if (lookup.isSkipped) {
        continue;
      }
      // A window read earlier outlives a later failed lookup: routing-service writes NULL over
      // a window the snapshot omits, so dropping a known value on a timeout would lose it.
      const tokens = lookup.tokens ?? this.cache.get(lookup.modelName)?.tokens;
      this.cache.set(lookup.modelName, {
        tokens,
        expiresAt:
          Date.now() +
          (lookup.tokens === undefined ? OLLAMA_SHOW_FAILURE_RETRY_MS : OLLAMA_SHOW_CACHE_TTL_MS),
      });
      if (tokens !== undefined) {
        windows.set(lookup.modelName, tokens);
      }
    }

    this.logger.log(
      `resolve: models=${String(wanted.size)} lookedUp=${String(toLookUp.length)} overCap=${String(pending.length - toLookUp.length)} known=${String(windows.size)}`,
    );
    return windows;
  }

  // The cache never outgrows the installed set: a model that was uninstalled is forgotten.
  private forgetUninstalled(installed: ReadonlySet<string>): void {
    for (const modelName of this.cache.keys()) {
      if (!installed.has(modelName)) {
        this.cache.delete(modelName);
      }
    }
  }

  private async lookUp(modelName: string, deadline: number): Promise<OllamaContextWindowLookup> {
    if (Date.now() >= deadline) {
      return { modelName, isSkipped: true, tokens: undefined };
    }
    const adapter = getRuntimeAdapter(RuntimeType.OLLAMA);
    if (adapter.showModel === undefined) {
      return { modelName, isSkipped: true, tokens: undefined };
    }
    try {
      const body = await adapter.showModel(modelName, OLLAMA_SHOW_TIMEOUT_MS);
      return { modelName, isSkipped: false, tokens: parseOllamaContextLength(body) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`lookUp: /api/show failed for ${modelName}: ${message}`);
      return { modelName, isSkipped: false, tokens: undefined };
    }
  }
}
