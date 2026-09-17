import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  RESEARCH_GATE_CACHE_MAX_ENTRIES,
  RESEARCH_GATE_CACHE_TTL_MS,
  RESEARCH_GATE_MAX_TOKENS,
  RESEARCH_GATE_SYSTEM_PROMPT,
  RESEARCH_GATE_TIMEOUT_MS,
} from '../../../common/constants/research-gate.constants';
import { httpRequest } from '../../../common/utilities';
import type {
  ResearchGateCacheEntry,
  ResearchGateModelReply,
  ResearchGateVerdict,
} from '../types/research-gate.types';
import { parseResearchGateVerdict } from '../utilities/research-gate.utility';

/**
 * Asks a small model whether this turn needs the internet, before answering it.
 *
 * Keyword matching was the first attempt and it was the wrong tool: it cannot
 * tell "what's the latest on the Gaza ceasefire" from "summarise the latest
 * version of my essay", and the failure it produced was the expensive one —
 * research running on ordinary chat. A model reads the sentence.
 *
 * Three properties, in this order:
 *
 *   1. FAILS CLOSED. A timeout, a bad reply, an unreachable runtime — all mean
 *      no web access. This gate exists to REDUCE lookups; a gate that searches
 *      when it breaks is worse than no gate.
 *   2. CHEAP. One small model, a 64-token ceiling and a 6s timeout, because it
 *      runs before every reply including the ones that need nothing.
 *   3. EXPLAINS ITSELF. The verdict carries a reason and it is logged, so
 *      "why did this search" has an answer.
 *
 * A URL in the message does NOT come here — a pasted link is an explicit
 * instruction to read that page and needs no interpretation.
 *
 * Candidates are tried in order and are CLOUD-FIRST. Production runs no local
 * Ollama, so a local default there fails every call, fails closed, and makes
 * AUTO research silently never fire — a feature that looks implemented and
 * does nothing. The local 1.7B is last: right on a laptop, absent in prod.
 */
@Injectable()
export class ResearchGateService {
  private readonly logger = new Logger(ResearchGateService.name);

  /**
   * Verdicts are cached briefly because one turn asks twice: once where
   * research starts, once in context assembly. Without this the user pays two
   * model calls to answer one question about one sentence.
   */
  private readonly cache = new Map<string, ResearchGateCacheEntry>();

  async needsWeb(message: string): Promise<ResearchGateVerdict> {
    const cached = this.readCache(message);
    if (cached !== null) {
      return cached;
    }
    const config = AppConfig.get();
    const candidates = [config.RESEARCH_GATE_MODEL, ...config.RESEARCH_GATE_FALLBACK_MODELS];
    for (const model of candidates) {
      const verdict = await this.ask(model, message);
      if (verdict !== null) {
        this.logger.log(
          `needsWeb=${String(verdict.needsWeb)} model=${model} reason="${verdict.reason}"`,
        );
        this.writeCache(message, verdict);
        return verdict;
      }
    }
    // Every candidate refused or timed out. Fail closed: no web access.
    this.logger.warn(
      `needsWeb: no classifier answered (tried ${candidates.join(', ')}) - assuming no`,
    );
    const verdict: ResearchGateVerdict = { needsWeb: false, reason: 'no classifier reachable' };
    // Cached too: if no classifier is reachable for this message, the second
    // caller in the same turn will not reach one either, and re-proving that
    // costs another full round of timeouts.
    this.writeCache(message, verdict);
    return verdict;
  }

  private readCache(message: string): ResearchGateVerdict | null {
    const entry = this.cache.get(message);
    if (entry === undefined) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(message);
      return null;
    }
    return entry.verdict;
  }

  private writeCache(message: string, verdict: ResearchGateVerdict): void {
    if (this.cache.size >= RESEARCH_GATE_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (oldest.done === false) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(message, { verdict, expiresAt: Date.now() + RESEARCH_GATE_CACHE_TTL_MS });
  }

  /** Null means "this model did not answer", so the caller tries the next. */
  private async ask(model: string, message: string): Promise<ResearchGateVerdict | null> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<ResearchGateModelReply>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model,
          prompt: `${RESEARCH_GATE_SYSTEM_PROMPT}

User message:
${message}`,
          stream: false,
          // Thinking OFF, and this is load-bearing. Every candidate here is a
          // reasoning model: left on, the whole num_predict budget is spent
          // inside `thinking` and `response` comes back EMPTY, which the parser
          // correctly reads as unparseable and fails closed. The gate then says
          // "no web" to every message for a reason that has nothing to do with
          // the message — measured live, qwen3:1.7b returned 64 tokens of
          // thinking and an empty answer. With it off the same model replies
          // with the JSON object on the first try.
          think: false,
          options: { num_predict: RESEARCH_GATE_MAX_TOKENS, temperature: 0 },
        },
        timeoutMs: RESEARCH_GATE_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.debug(`ask: ${model} returned ${String(response.status)}`);
        return null;
      }
      return parseResearchGateVerdict(response.data.response ?? '');
    } catch (error) {
      this.logger.debug(`ask: ${model} failed - ${(error as Error).message}`);
      return null;
    }
  }
}
