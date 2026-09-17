import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  RESEARCH_GATE_MAX_TOKENS,
  RESEARCH_GATE_SYSTEM_PROMPT,
  RESEARCH_GATE_TIMEOUT_MS,
} from '../../../common/constants/research-gate.constants';
import { httpRequest } from '../../../common/utilities';
import type {
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
 */
@Injectable()
export class ResearchGateService {
  private readonly logger = new Logger(ResearchGateService.name);

  async needsWeb(message: string): Promise<ResearchGateVerdict> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<ResearchGateModelReply>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: config.RESEARCH_GATE_MODEL,
          prompt: `${RESEARCH_GATE_SYSTEM_PROMPT}\n\nUser message:\n${message}`,
          stream: false,
          options: { num_predict: RESEARCH_GATE_MAX_TOKENS, temperature: 0 },
        },
        timeoutMs: RESEARCH_GATE_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`needsWeb: classifier returned ${String(response.status)} — assuming no`);
        return { needsWeb: false, reason: 'classifier unavailable' };
      }
      const verdict = parseResearchGateVerdict(response.data.response ?? '');
      this.logger.debug(`needsWeb=${String(verdict.needsWeb)} reason="${verdict.reason}"`);
      return verdict;
    } catch (error) {
      this.logger.warn(`needsWeb: classifier failed — ${(error as Error).message}; assuming no`);
      return { needsWeb: false, reason: 'classifier error' };
    }
  }
}
