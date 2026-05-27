// AIRoutePlannerManager — Phase 4 of the semantic router flagship.
// See docs/03-architecture/semantic-router-flagship-plan.md.
//
// Pairs with SemanticIntentAnalyzerManager (Phase 2): the analyzer
// extracts intent, this planner picks a model + workflow + fallback
// chain from the AVAILABLE candidate list. Validation gates run AFTER
// the model returns to catch hallucinated model names / privacy
// violations / unavailable picks. In Phase 4 the plan is stored as
// shadow output; Phase 5's FallbackExecutorManager will consume it.

import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  AI_ROUTE_PLANNER_MAX_ATTEMPTS,
  AI_ROUTE_PLANNER_MAX_CANDIDATES_IN_PROMPT,
  AI_ROUTE_PLANNER_MAX_TOKENS,
  AI_ROUTE_PLANNER_MESSAGE_TRUNCATE_CHARS,
  AI_ROUTE_PLANNER_RAW_OUTPUT_MAX_CHARS,
  AI_ROUTE_PLANNER_RETRY_PROMPT,
  AI_ROUTE_PLANNER_SYSTEM_PROMPT,
  AI_ROUTE_PLANNER_TIMEOUT_MS,
} from '../constants/ai-route-planner.constants';
import { aiRoutePlanSchema } from '../schemas/ai-route-plan.schema';
import type {
  AIRoutePlan,
  AIRoutePlanRecord,
  AIRoutePlanValidationIssue,
  AIRoutePlannerInput,
  AIRoutePlannerStatus,
  OllamaGeneratePlannerResponse,
  PlannerCandidate,
} from '../types/ai-route-plan.types';

@Injectable()
export class AIRoutePlannerManager {
  private readonly logger = new Logger(AIRoutePlannerManager.name);

  async plan(input: AIRoutePlannerInput): Promise<AIRoutePlanRecord> {
    const start = Date.now();
    const config = AppConfig.get();

    if (!config.ROUTING_AI_ROUTE_PLANNER_ENABLED) {
      return this.buildSkipped('SKIPPED_FLAG_DISABLED', config.OLLAMA_ROUTER_MODEL, start);
    }

    if (!input.semanticIntent) {
      // Planner relies on the Phase 2 analyzer output to be meaningful.
      // Without intent it would degenerate into "pick any model" — better
      // to skip and let the v1 hot path handle it.
      return this.buildSkipped('SKIPPED_NO_ANALYSIS', config.OLLAMA_ROUTER_MODEL, start);
    }

    this.logger.debug(
      `plan: starting thread=${input.threadId} candidates=${String(input.candidates.length)} mode=${input.routingMode}`,
    );

    const userPrompt = this.buildUserPrompt(input);
    let lastRaw = '';
    let attempts = 0;

    while (attempts < AI_ROUTE_PLANNER_MAX_ATTEMPTS) {
      attempts += 1;
      const isRetry = attempts > 1;
      const fullPrompt = isRetry
        ? `${AI_ROUTE_PLANNER_SYSTEM_PROMPT}\n\n${AI_ROUTE_PLANNER_RETRY_PROMPT}\n\n${userPrompt}\n\nPrevious malformed/invalid output:\n${lastRaw.slice(0, 500)}`
        : `${AI_ROUTE_PLANNER_SYSTEM_PROMPT}\n\n${userPrompt}`;

      const callResult = await this.callOllama(fullPrompt, config.OLLAMA_ROUTER_MODEL);
      if (callResult.status !== 'SUCCESS' || callResult.raw === null) {
        return this.buildFailure(
          callResult.status,
          config.OLLAMA_ROUTER_MODEL,
          attempts,
          start,
          callResult.failureReason,
          lastRaw,
          [],
        );
      }

      lastRaw = callResult.raw;
      const parsed = this.parseAndValidateJson(callResult.raw);
      if (!parsed) {
        continue; // retry with stricter prompt
      }

      // Post-parse safety gates (§7.4 of the flagship prompt).
      const validationIssues = this.runValidationGates(parsed, input);
      if (validationIssues.length === 0) {
        this.logger.log(
          `plan: success thread=${input.threadId} attempts=${String(attempts)} provider=${parsed.selectedProvider} model=${parsed.selectedModel} workflow=${parsed.selectedWorkflow} confidence=${String(parsed.confidence)}`,
        );
        return {
          status: 'SUCCESS',
          plan: parsed,
          validationIssues: [],
          routerModel: config.OLLAMA_ROUTER_MODEL,
          attempts,
          durationMs: Date.now() - start,
        };
      }

      this.logger.warn(
        `plan: validation failed thread=${input.threadId} attempts=${String(attempts)} issues=${validationIssues.map((i) => i.code).join(',')}`,
      );

      if (attempts < AI_ROUTE_PLANNER_MAX_ATTEMPTS) {
        continue; // retry once more with stricter prompt
      }

      return this.buildFailure(
        'VALIDATION_FAILED',
        config.OLLAMA_ROUTER_MODEL,
        attempts,
        start,
        `Validation failed: ${validationIssues.map((i) => i.code).join(', ')}`,
        lastRaw,
        validationIssues,
      );
    }

    return this.buildFailure(
      'INVALID_JSON_AFTER_RETRY',
      config.OLLAMA_ROUTER_MODEL,
      attempts,
      start,
      'Parsed JSON did not match AIRoutePlan schema after retry',
      lastRaw,
      [],
    );
  }

  private buildUserPrompt(input: AIRoutePlannerInput): string {
    const lines: string[] = [];
    lines.push(
      `Current user message:\n"""${input.message.slice(0, AI_ROUTE_PLANNER_MESSAGE_TRUNCATE_CHARS)}"""`,
    );
    lines.push(`Routing mode: ${input.routingMode}`);

    if (input.activePolicyName) {
      lines.push(`Active policy: ${input.activePolicyName}`);
    }
    if (input.budgetClass) {
      lines.push(`Budget class: ${input.budgetClass}`);
    }

    if (input.semanticIntent) {
      // We don't dump the whole analysis — just the parts that drive
      // routing decisions. The full object lives on the row already.
      const si = input.semanticIntent;
      lines.push(
        `Semantic intent:\n  - primaryIntent: ${si.primaryIntent}\n  - taskType: ${si.taskType}\n  - domainTags: ${si.domainTags.join(', ') || '(none)'}\n  - modalityNeeds: ${si.modalityNeeds.join(', ')}\n  - expectedOutputType: ${si.expectedOutputType}\n  - privacyClass: ${si.privacyClass}\n  - riskLevel: ${si.riskLevel}\n  - confidence: ${si.confidence.toFixed(2)}\n  - requiresSearch: ${si.requiresSearch}\n  - requiresExtraction: ${si.requiresExtraction}\n  - requiresJudge: ${si.requiresJudge}\n  - requiresCompare: ${si.requiresCompare}`,
      );
    }

    if (input.providerHealth) {
      const downProviders = Object.entries(input.providerHealth)
        .filter(([, healthy]) => !healthy)
        .map(([provider]) => provider);
      if (downProviders.length > 0) {
        lines.push(`Providers currently DOWN: ${downProviders.join(', ')}`);
      }
    }

    const candidates = input.candidates
      .filter((c) => c.isAvailable && c.isExecutionModel && !c.isRouterOnly)
      .slice(0, AI_ROUTE_PLANNER_MAX_CANDIDATES_IN_PROMPT);

    if (candidates.length === 0) {
      lines.push('Available candidates: (none — no execution models are reachable)');
    } else {
      const candLines = candidates.map((c) => this.formatCandidate(c));
      lines.push(`Available candidates (pick from this list only):\n${candLines.join('\n')}`);
    }

    return lines.join('\n\n');
  }

  private formatCandidate(c: PlannerCandidate): string {
    const fields: string[] = [`${c.provider}/${c.model}`];
    if (c.qualityTier) fields.push(`tier=${c.qualityTier}`);
    if (c.costClass) fields.push(`cost=${c.costClass}`);
    if (c.latencyClass) fields.push(`latency=${c.latencyClass}`);
    if (c.privacyClass) fields.push(`privacy=${c.privacyClass}`);
    if (c.supportsTools !== null && c.supportsTools !== undefined) {
      fields.push(`tools=${String(c.supportsTools)}`);
    }
    if (c.supportsVision !== null && c.supportsVision !== undefined) {
      fields.push(`vision=${String(c.supportsVision)}`);
    }
    if (c.supportsLongContext !== null && c.supportsLongContext !== undefined) {
      fields.push(`longCtx=${String(c.supportsLongContext)}`);
    }
    if (c.domainStrengths && c.domainStrengths.length > 0) {
      fields.push(`strong=[${c.domainStrengths.slice(0, 4).join(',')}]`);
    }
    if (c.weakDomains && c.weakDomains.length > 0) {
      fields.push(`weak=[${c.weakDomains.slice(0, 4).join(',')}]`);
    }
    return `- ${fields.join(' | ')}`;
  }

  // Returns null on any failure so the outer retry loop can drive.
  private parseAndValidateJson(raw: string): AIRoutePlan | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.debug('parseAndValidateJson: no JSON object in model output');
        return null;
      }
      const candidate = JSON.parse(jsonMatch[0]) as unknown;
      const result = aiRoutePlanSchema.safeParse(candidate);
      if (!result.success) {
        this.logger.debug(
          `parseAndValidateJson: zod failed with ${String(result.error.issues.length)} issues`,
        );
        return null;
      }
      return result.data as AIRoutePlan;
    } catch {
      this.logger.debug('parseAndValidateJson: JSON.parse threw');
      return null;
    }
  }

  // Hard rules from §7.4 — every issue here is a non-negotiable that the
  // model is not allowed to violate. On any issue the planner retries
  // once with a stricter prompt; on second failure the record gets
  // VALIDATION_FAILED status.
  private runValidationGates(
    plan: AIRoutePlan,
    input: AIRoutePlannerInput,
  ): AIRoutePlanValidationIssue[] {
    const issues: AIRoutePlanValidationIssue[] = [];
    const candidateByKey = new Map<string, PlannerCandidate>();
    for (const c of input.candidates) {
      candidateByKey.set(`${c.provider}::${c.model}`, c);
    }

    const primary = candidateByKey.get(`${plan.selectedProvider}::${plan.selectedModel}`);
    if (!primary) {
      issues.push({
        code: 'PRIMARY_NOT_IN_CANDIDATES',
        message: `Selected ${plan.selectedProvider}/${plan.selectedModel} is not in the candidate list`,
        candidate: { provider: plan.selectedProvider, model: plan.selectedModel },
      });
    } else {
      if (!primary.isAvailable) {
        issues.push({
          code: 'PRIMARY_NOT_AVAILABLE',
          message: `Selected ${plan.selectedProvider}/${plan.selectedModel} is unavailable`,
          candidate: { provider: plan.selectedProvider, model: plan.selectedModel },
        });
      }
      if (primary.isRouterOnly) {
        issues.push({
          code: 'PRIMARY_IS_ROUTER_ONLY',
          message: `Selected ${plan.selectedProvider}/${plan.selectedModel} is router-only`,
          candidate: { provider: plan.selectedProvider, model: plan.selectedModel },
        });
      }
      if (!primary.isExecutionModel) {
        issues.push({
          code: 'PRIMARY_NOT_EXECUTION',
          message: `Selected ${plan.selectedProvider}/${plan.selectedModel} is not an execution model`,
          candidate: { provider: plan.selectedProvider, model: plan.selectedModel },
        });
      }
      if (
        input.semanticIntent?.privacyClass === 'local' &&
        primary.privacyClass &&
        primary.privacyClass !== 'local'
      ) {
        issues.push({
          code: 'PRIVACY_VIOLATION',
          message: `Intent requires local privacy but selected ${plan.selectedProvider}/${plan.selectedModel} is ${primary.privacyClass}`,
          candidate: { provider: plan.selectedProvider, model: plan.selectedModel },
        });
      }
    }

    for (const fb of plan.fallbackChain) {
      const c = candidateByKey.get(`${fb.provider}::${fb.model}`);
      if (!c) {
        issues.push({
          code: 'FALLBACK_NOT_IN_CANDIDATES',
          message: `Fallback ${fb.provider}/${fb.model} is not in the candidate list`,
          candidate: { provider: fb.provider, model: fb.model },
        });
      }
    }

    return issues;
  }

  private async callOllama(
    prompt: string,
    routerModel: string,
  ): Promise<{ status: AIRoutePlannerStatus; raw: string | null; failureReason?: string }> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<OllamaGeneratePlannerResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: routerModel,
          prompt,
          stream: false,
          think: false,
          keepAlive: config.OLLAMA_KEEP_ALIVE,
          options: { temperature: 0, num_predict: AI_ROUTE_PLANNER_MAX_TOKENS },
        },
        timeoutMs: AI_ROUTE_PLANNER_TIMEOUT_MS,
      });
      if (!response.ok) {
        return {
          status: 'OLLAMA_ERROR',
          raw: null,
          failureReason: `Ollama returned status ${String(response.status)}`,
        };
      }
      return { status: 'SUCCESS', raw: response.data.response };
    } catch (error) {
      const reason = (error as Error).message;
      const isTimeout = /timeout|abort/i.test(reason);
      return {
        status: isTimeout ? 'OLLAMA_TIMEOUT' : 'OLLAMA_ERROR',
        raw: null,
        failureReason: reason,
      };
    }
  }

  private buildSkipped(
    status: AIRoutePlannerStatus,
    routerModel: string,
    start: number,
  ): AIRoutePlanRecord {
    return {
      status,
      plan: null,
      validationIssues: [],
      routerModel,
      attempts: 0,
      durationMs: Date.now() - start,
    };
  }

  private buildFailure(
    status: AIRoutePlannerStatus,
    routerModel: string,
    attempts: number,
    start: number,
    failureReason: string | undefined,
    lastRaw: string,
    validationIssues: AIRoutePlanValidationIssue[],
  ): AIRoutePlanRecord {
    return {
      status,
      plan: null,
      validationIssues,
      rawOutputExcerpt:
        lastRaw.length > 0 ? lastRaw.slice(0, AI_ROUTE_PLANNER_RAW_OUTPUT_MAX_CHARS) : undefined,
      routerModel,
      attempts,
      durationMs: Date.now() - start,
      failureReason,
    };
  }
}
