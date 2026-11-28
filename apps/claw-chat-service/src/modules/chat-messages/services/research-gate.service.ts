import { Injectable, Logger, Optional } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  CONNECTOR_CONFIG_PATH,
  CONNECTOR_CONFIG_TIMEOUT_MS,
  OLLAMA_CLOUD_PROVIDER,
  OLLAMA_CONNECTOR_PROVIDER,
  RESEARCH_GATE_CACHE_MAX_ENTRIES,
  RESEARCH_GATE_CACHE_TTL_MS,
  RESEARCH_GATE_CANDIDATES_PATH,
  RESEARCH_GATE_CANDIDATES_TIMEOUT_MS,
  RESEARCH_GATE_CANDIDATES_TTL_MS,
  RESEARCH_GATE_SYSTEM_PROMPT,
  RESEARCH_PLANNER_ATTACHMENT_DIGEST_LABEL,
  RESEARCH_PLANNER_CONVERSATION_LABEL,
  RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
  RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
  RESEARCH_PLANNER_SYSTEM_PROMPT,
  RESEARCH_REPLAN_SUMMARY_MAX_CHARS,
  RESEARCH_REPLAN_SYSTEM_PROMPT,
} from '../../../common/constants/research-gate.constants';
import { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import { resolveOllamaCloudBaseUrl } from '../../../common/utilities/ollama-cloud-base-url.utility';
import { isExplicitWebRequest } from '../../../common/utilities/explicit-web-request.utility';
import { detectPromptUrls } from '../../../common/utilities/prompt-url.utility';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import type { ConnectorConfigResponse } from '../types/execution.types';
import type {
  CrawlFollowUp,
  OllamaCloudChatReply,
  ResearchGapCheck,
  ResearchGateCacheEntry,
  ResearchGateCandidate,
  ResearchGateModelReply,
  ResearchGateVerdict,
  ResearchPlan,
} from '../types/research-gate.types';
import { RESEARCH_GAP_CHECK_FAILED_CLOSED } from '../constants/research-gap-check.constants';
import { parseResearchGateVerdict } from '../utilities/research-gate.utility';
import { applyCouncilToPlan } from '../utilities/harness-council.utility';
import {
  buildGapCheckPrompt,
  parseResearchGapCheck,
} from '../utilities/research-gap-check.utility';
import {
  defaultResearchDepth,
  parseCrawlFollowUp,
  parseResearchPlan,
} from '../utilities/research-plan.utility';
import { HarnessCouncilService } from './harness-council.service';

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

  /**
   * The harness council decides first when an admin configured one (research engine, 2026-11-27); this gate's own
   * single-model chain is the fallback. Optional so a hand-built gate (specs) keeps the single-model behaviour.
   */
  constructor(@Optional() private readonly council?: HarnessCouncilService) {}

  async needsWeb(message: string): Promise<ResearchGateVerdict> {
    const cached = this.readCache(message);
    if (cached !== null) {
      return cached;
    }
    const councilVerdict = await this.askCouncil(message);
    if (councilVerdict !== null) {
      this.writeCache(message, councilVerdict);
      return councilVerdict;
    }
    const candidates = await this.resolveCandidates();
    if (candidates.length === 0) {
      // No configured candidate is not an error: an admin may have switched the
      // gate off by emptying the list, and that means "never research", which
      // is the same answer failing closed gives.
      const verdict: ResearchGateVerdict = isExplicitWebRequest(message)
        ? { needsWeb: true, reason: 'explicit web request, no classifier configured' }
        : { needsWeb: false, reason: 'no classifier configured' };
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
    // Every candidate refused or timed out. Fail closed, except for a plain
    // order to use the internet: refusing that is the "I cannot search" bug.
    const explicit = isExplicitWebRequest(message);
    this.logger.warn(
      `needsWeb: no classifier answered (tried ${candidates.map((c) => c.modelAlias).join(', ')}) - assuming ${explicit ? 'yes (explicit request)' : 'no'}`,
    );
    const verdict: ResearchGateVerdict = explicit
      ? { needsWeb: true, reason: 'explicit web request, no classifier reachable' }
      : { needsWeb: false, reason: 'no classifier reachable' };
    // Cached too: if no classifier is reachable for this message, the second
    // caller in the same turn will not reach one either, and re-proving that
    // costs another full round of timeouts.
    this.writeCache(message, verdict);
    return verdict;
  }

  /**
   * The council's verdict as a gate verdict, or null when no council is configured or none of it answered. A plain
   * order to use the internet always researches, whatever the vote: refusing it is the "I cannot search" bug.
   */
  private async askCouncil(
    message: string,
    conversation = '',
  ): Promise<ResearchGateVerdict | null> {
    const council = await this.council?.decide(
      message,
      (candidate, prompt, minOutputTokens) => this.generate(candidate, prompt, minOutputTokens),
      conversation,
    );
    if (council === undefined || council === null) {
      return null;
    }
    const tally = `${String(council.majority.length)}/${String(council.answered)} of ${String(council.asked)}`;
    if (!council.needsWeb && isExplicitWebRequest(message)) {
      return {
        needsWeb: true,
        reason: `explicit web request overrides the council (${tally} said no)`,
        council: { ...council, needsWeb: true, depth: Math.max(council.depth, 1) },
      };
    }
    return {
      needsWeb: council.needsWeb,
      reason: `council ${tally} (${council.majority.join(', ')}) depth ${String(council.depth)}`,
      council,
    };
  }

  /** The council's verdict for this message: the one needsWeb already cached, else a fresh vote (cached). */
  private async councilVerdictFor(
    message: string,
    conversation: string,
  ): Promise<ResearchGateVerdict | null> {
    // The same words mean different things after different turns ("search again"), so the history is in the key.
    const key = conversation.length > 0 ? `${message}\u0000${conversation}` : message;
    const cached = this.readCache(key);
    if (cached?.council !== undefined) {
      return cached;
    }
    const verdict = await this.askCouncil(message, conversation);
    if (verdict !== null) {
      this.writeCache(key, verdict);
    }
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
   *
   * `attachmentDigest` (multimodal batch 8) is a short, already-bounded
   * excerpt of the attachments' derived text — a clip's transcript, an
   * image's OCR — so "listen to this and research the person mentioned" can
   * be planned. It is framed as data, and URLs inside it are never crawled on
   * their own: only the user's message is scanned for links.
   */
  async plan(message: string, attachmentDigest = '', conversation = ''): Promise<ResearchPlan> {
    const userUrls = detectPromptUrls(message);
    // A link read out of an attachment (OCR, a document) is data about the
    // file, not a site the user asked for: the planner may not crawl it.
    const attachmentUrls = attachmentDigest.length > 0 ? detectPromptUrls(attachmentDigest) : [];
    const planOptions = {
      hasAttachments: attachmentDigest.length > 0,
      excludedUrls: attachmentUrls.filter((url) => !userUrls.includes(url)),
    };
    // The council and the planner run side by side: the planner writes the query, URLs and narration, the
    // council's majority decides WHETHER to research and how deep (research engine, 2026-11-27).
    const [verdict, planned] = await Promise.all([
      this.councilVerdictFor(message, conversation),
      this.planWithModels(message, { attachmentDigest, conversation }, userUrls, planOptions),
    ]);
    const plan = applyCouncilToPlan(planned, verdict?.council, {
      message,
      hasUserLinks: userUrls.length > 0,
      explicitWebRequest: isExplicitWebRequest(message),
    });
    if (plan !== planned) {
      this.logger.log(
        `plan: council applied action=${planned.action}->${plan.action} maxPages=${String(planned.maxPages)}->${String(plan.maxPages)} depth=${String(plan.depth)} subQuestions=${String(plan.subQuestions.length)} languages=[${plan.languages.join(',')}] (${plan.decidedBy ?? ''})`,
      );
    }
    return plan;
  }

  /** The admin's planner models, walked in order until one returns a usable plan; the user's own URLs otherwise. */
  private async planWithModels(
    message: string,
    context: { attachmentDigest: string; conversation: string },
    userUrls: string[],
    planOptions: { hasAttachments: boolean; excludedUrls: string[] },
  ): Promise<ResearchPlan> {
    const candidates = await this.resolveCandidates();
    const digestBlock =
      context.attachmentDigest.length > 0
        ? `\n\n${RESEARCH_PLANNER_ATTACHMENT_DIGEST_LABEL}\n${context.attachmentDigest}`
        : '';
    const historyBlock =
      context.conversation.length > 0
        ? `\n\n${RESEARCH_PLANNER_CONVERSATION_LABEL}\n<<<\n${context.conversation}\n>>>`
        : '';
    for (const candidate of candidates) {
      const raw = await this.generate(
        candidate,
        `${RESEARCH_PLANNER_SYSTEM_PROMPT}${historyBlock}

User message:
${message}${digestBlock}`,
        RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
      );
      const plan = raw === null ? null : parseResearchPlan(raw, userUrls, planOptions);
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
    return this.unansweredPlan(message, userUrls);
  }

  /** Nobody planned: crawl the user's own links, search a plain order to search, else answer. */
  private unansweredPlan(message: string, userUrls: readonly string[]): ResearchPlan {
    const hasLinks = userUrls.length > 0;
    const searches = !hasLinks && isExplicitWebRequest(message);
    let action = PlannedResearchAction.ANSWER;
    if (hasLinks) {
      action = PlannedResearchAction.CRAWL;
    } else if (searches) {
      action = PlannedResearchAction.SEARCH;
    }
    return {
      action,
      urls: [...userUrls],
      query: searches ? message : null,
      maxPages: RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
      narration: '',
      thinking: '',
      decidedBy: null,
      subQuestions: [],
      languages: [],
      platforms: [],
      depth: defaultResearchDepth(action),
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

  /**
   * After a search round (research engine B2): is anything still missing to answer the message, and what should the
   * next round search? Same models, same JSON-only call and same walk as `followUpAfterCrawl`; the message, the queries
   * already run and the evidence are fenced as data. Fails closed to "done": another round spends the user's search
   * allowance, and the turn already holds the evidence it gathered.
   */
  async gapCheck(
    message: string,
    evidenceSummary: string,
    queriesRun: readonly string[],
  ): Promise<ResearchGapCheck> {
    const gap = await this.askPlanner(
      buildGapCheckPrompt(message, evidenceSummary, queriesRun),
      RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
      parseResearchGapCheck,
    );
    if (gap === null) {
      this.logger.warn('gapCheck: no model gave a usable answer - research stops with what it has');
      return { ...RESEARCH_GAP_CHECK_FAILED_CLOSED };
    }
    this.logger.log(`gapCheck: done=${String(gap.done)} queries=${String(gap.queries.length)}`);
    return gap;
  }

  /**
   * One JSON-only question to the admin's ordered planner models (ADR-134);
   * the first reply `parse` accepts wins. Same candidates, same metering
   * policy and same fail-closed walk as the research gate — null when none
   * answers usably, and the caller decides what "no answer" means.
   */
  async askPlanner<T>(
    prompt: string,
    minOutputTokens: number,
    parse: (raw: string) => T | null,
  ): Promise<T | null> {
    for (const candidate of await this.resolveCandidates()) {
      const raw = await this.generate(candidate, prompt, minOutputTokens);
      const parsed = raw === null ? null : parse(raw);
      if (parsed !== null) {
        this.logger.debug(`askPlanner: answered by ${candidate.modelAlias}`);
        return parsed;
      }
    }
    this.logger.warn('askPlanner: no planner model gave a usable answer');
    return null;
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
    if (candidate.provider === OLLAMA_CLOUD_PROVIDER) {
      return this.generateOnOllamaCloud(candidate, prompt, minOutputTokens);
    }
    const config = AppConfig.get();
    try {
      const response = await httpRequest<ResearchGateModelReply>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
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

  /**
   * Hosted Ollama, with the key an admin saved on the Ollama connector.
   *
   * Same contract as the local path: thinking off, JSON-only by decoder, and
   * null on any failure so the walk moves to the next configured model.
   */
  private async generateOnOllamaCloud(
    candidate: ResearchGateCandidate,
    prompt: string,
    minOutputTokens: number,
  ): Promise<string | null> {
    const credential = await this.fetchOllamaCredential();
    if (credential === null) {
      this.logger.warn('generate: no Ollama Cloud connector key; skipping this model');
      return null;
    }
    const ollamaCloudBaseUrl = resolveOllamaCloudBaseUrl(credential.baseUrl);
    try {
      const response = await httpRequest<OllamaCloudChatReply>({
        url: `${ollamaCloudBaseUrl}/chat`,
        // Admin-configured connector base URL: on no static allowlist, so the
        // caller declares it. Taken from the resolved BASE url, not the
        // finished one.
        allowedHosts: declaredHost(ollamaCloudBaseUrl),
        method: 'POST',
        headers: { Authorization: `Bearer ${credential.apiKey}` },
        body: {
          model: candidate.modelAlias,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          think: false,
          options: { num_predict: Math.max(candidate.maxTokens, minOutputTokens), temperature: 0 },
        },
        timeoutMs: candidate.timeoutMs,
      });
      if (!response.ok) {
        this.logger.warn(
          `generate: ${candidate.modelAlias} on Ollama Cloud returned ${String(response.status)}`,
        );
        return null;
      }
      return response.data.message?.content ?? '';
    } catch (error) {
      this.logger.warn(
        `generate: ${candidate.modelAlias} on Ollama Cloud failed - ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async fetchOllamaCredential(): Promise<ConnectorConfigResponse | null> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<ConnectorConfigResponse>({
        url: `${config.CONNECTOR_SERVICE_URL}${CONNECTOR_CONFIG_PATH}?provider=${OLLAMA_CONNECTOR_PROVIDER}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: CONNECTOR_CONFIG_TIMEOUT_MS,
      });
      return response.ok && response.data.apiKey.length > 0 ? response.data : null;
    } catch {
      return null;
    }
  }
}
