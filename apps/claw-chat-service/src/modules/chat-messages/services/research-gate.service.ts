import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  RESEARCH_GATE_CACHE_MAX_ENTRIES,
  RESEARCH_GATE_CACHE_TTL_MS,
  RESEARCH_GATE_CANDIDATES_PATH,
  RESEARCH_GATE_CANDIDATES_TIMEOUT_MS,
  RESEARCH_GATE_CANDIDATES_TTL_MS,
  RESEARCH_GATE_SYSTEM_PROMPT,
  RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
  RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
  RESEARCH_PLANNER_SYSTEM_PROMPT,
  RESEARCH_REPLAN_SUMMARY_MAX_CHARS,
  RESEARCH_REPLAN_SYSTEM_PROMPT,
} from '../../../common/constants/research-gate.constants';
import { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import { detectPromptUrls } from '../../../common/utilities/prompt-url.utility';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import type {
  CrawlFollowUp,
  ResearchGateCacheEntry,
  ResearchGateCandidate,
  ResearchGateModelReply,
  ResearchGateVerdict,
  ResearchPlan,
} from '../types/research-gate.types';
import { parseResearchGateVerdict } from '../utilities/research-gate.utility';
import { parseCrawlFollowUp, parseResearchPlan } from '../utilities/research-plan.utility';

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
 * Candidates are tried in order and come from routing-service, where an admin
 * owns them on the Smart Router page. They used to be environment variables,
 * which was wrong twice: changing the model meant a redeploy, and a name in an
 * env var is checked against nothing, so a retired model would fail closed
 * forever with nothing to see.
 *
 * The configured order is CLOUD-FIRST. Production runs no local Ollama, so a
 * local first choice fails every call, fails closed, and makes AUTO research
 * silently never fire — a feature that looks implemented and does nothing.
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

  /** Last fetched candidate list, and when it goes stale. */
  private candidates: readonly ResearchGateCandidate[] | null = null;
  private candidatesExpireAt = 0;

  async needsWeb(message: string): Promise<ResearchGateVerdict> {
    const cached = this.readCache(message);
    if (cached !== null) {
      return cached;
    }
    const candidates = await this.resolveCandidates();
    if (candidates.length === 0) {
      // No configured candidate is not an error: an admin may have switched the
      // gate off by emptying the list, and that means "never research", which
      // is the same answer failing closed gives.
      const verdict: ResearchGateVerdict = { needsWeb: false, reason: 'no classifier configured' };
      this.writeCache(message, verdict);
      return verdict;
    }
    for (const candidate of candidates) {
      const verdict = await this.ask(candidate, message);
      if (verdict !== null) {
        this.logger.log(
          `needsWeb=${String(verdict.needsWeb)} model=${candidate.modelAlias} reason="${verdict.reason}"`,
        );
        this.writeCache(message, verdict);
        return verdict;
      }
    }
    // Every candidate refused or timed out. Fail closed: no web access.
    this.logger.warn(
      `needsWeb: no classifier answered (tried ${candidates.map((c) => c.modelAlias).join(', ')}) - assuming no`,
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

  /**
   * The admin-configured candidates, briefly cached.
   *
   * Cached so the gate does not fetch configuration on every message, and only
   * briefly so an admin's change on the Smart Router page takes effect without
   * a restart. An unreachable routing-service reuses the last known list rather
   * than disabling the gate on a transient blip.
   */
  private async resolveCandidates(): Promise<readonly ResearchGateCandidate[]> {
    if (this.candidates !== null && this.candidatesExpireAt > Date.now()) {
      return this.candidates;
    }
    const config = AppConfig.get();
    try {
      const response = await httpRequest<readonly ResearchGateCandidate[]>({
        url: `${config.ROUTING_SERVICE_URL}${RESEARCH_GATE_CANDIDATES_PATH}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: RESEARCH_GATE_CANDIDATES_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`resolveCandidates: routing-service returned ${String(response.status)}`);
        return this.candidates ?? [];
      }
      this.candidates = response.data;
      this.candidatesExpireAt = Date.now() + RESEARCH_GATE_CANDIDATES_TTL_MS;
      return this.candidates;
    } catch (error) {
      this.logger.warn(`resolveCandidates: ${(error as Error).message}`);
      return this.candidates ?? [];
    }
  }

  /**
   * Decides how a turn should use the web, walking the admin's ordered
   * candidates until one returns a usable plan.
   *
   * A reply that does not parse moves on to the next model rather than ending
   * the walk — the old gate treated one malformed answer as "no web", which
   * made every fallback after the first model decorative.
   *
   * Never throws. With no model reachable it falls back to what the user's own
   * text proves: a URL they wrote is crawled, anything else is answered
   * directly, so a planner outage never costs a pasted link its page.
   */
  async plan(message: string): Promise<ResearchPlan> {
    const userUrls = detectPromptUrls(message);
    const candidates = await this.resolveCandidates();
    for (const candidate of candidates) {
      const raw = await this.generate(
        candidate,
        `${RESEARCH_PLANNER_SYSTEM_PROMPT}

User message:
${message}`,
        RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
      );
      const plan = raw === null ? null : parseResearchPlan(raw, userUrls);
      if (plan !== null) {
        this.logger.log(
          `plan: action=${plan.action} urls=${String(plan.urls.length)} maxPages=${String(plan.maxPages)} model=${candidate.modelAlias}`,
        );
        return { ...plan, decidedBy: candidate.modelAlias };
      }
      this.logger.debug(`plan: ${candidate.modelAlias} gave no usable plan, trying the next model`);
    }
    this.logger.warn(
      `plan: no planner answered (tried ${String(candidates.length)}) - falling back to the user's own URLs`,
    );
    return {
      action: userUrls.length > 0 ? PlannedResearchAction.CRAWL : PlannedResearchAction.ANSWER,
      urls: userUrls,
      query: null,
      maxPages: RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
      narration: '',
      thinking: '',
      decidedBy: null,
    };
  }

  /**
   * The second look, after a crawl: given what was read, is a web search still
   * needed? Fails closed to "no" — the crawl already produced evidence, and an
   * unnecessary search spends the user's allowance.
   */
  async followUpAfterCrawl(message: string, crawlSummary: string): Promise<CrawlFollowUp> {
    const candidates = await this.resolveCandidates();
    const summary = crawlSummary.slice(0, RESEARCH_REPLAN_SUMMARY_MAX_CHARS);
    for (const candidate of candidates) {
      const raw = await this.generate(
        candidate,
        `${RESEARCH_REPLAN_SYSTEM_PROMPT}

User message:
${message}

What the pages said (summary):
${summary}`,
        RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
      );
      const followUp = raw === null ? null : parseCrawlFollowUp(raw);
      if (followUp !== null) {
        this.logger.log(
          `followUpAfterCrawl: needsSearch=${String(followUp.needsSearch)} model=${candidate.modelAlias}`,
        );
        return followUp;
      }
    }
    return { needsSearch: false, query: null, narration: '', thinking: '' };
  }

  /** Null means "this model did not answer", so the caller tries the next. */
  private async ask(
    candidate: ResearchGateCandidate,
    message: string,
  ): Promise<ResearchGateVerdict | null> {
    const raw = await this.generate(
      candidate,
      `${RESEARCH_GATE_SYSTEM_PROMPT}

User message:
${message}`,
      candidate.maxTokens,
    );
    return raw === null ? null : parseResearchGateVerdict(raw);
  }

  /** One model call; the raw reply text, or null when the model did not answer. */
  private async generate(
    candidate: ResearchGateCandidate,
    prompt: string,
    minOutputTokens: number,
  ): Promise<string | null> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<ResearchGateModelReply>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: candidate.modelAlias,
          prompt,
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
          options: {
            num_predict: Math.max(candidate.maxTokens, minOutputTokens),
            temperature: 0,
          },
        },
        timeoutMs: candidate.timeoutMs,
      });
      if (!response.ok) {
        this.logger.debug(`ask: ${candidate.modelAlias} returned ${String(response.status)}`);
        return null;
      }
      return response.data.response ?? '';
    } catch (error) {
      this.logger.debug(`ask: ${candidate.modelAlias} failed - ${(error as Error).message}`);
      return null;
    }
  }
}
