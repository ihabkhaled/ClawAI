// SemanticIntentAnalyzerManager — Phase 2 of the semantic router flagship
// (docs/03-architecture/semantic-router-flagship-plan.md).
//
// Runs an Ollama router model over the user prompt + recent thread context
// + weak keyword signals, and returns a structured SemanticIntentAnalysis.
// In Phase 2 the output is shadow-only: stored on the RoutingDecision row,
// never used to influence the actual route. Phase 4 will read it.
//
// The manager NEVER throws to the caller — Ollama outages, JSON parse
// failures, etc. all return a SemanticIntentAnalysisRecord with `analysis:
// null` and a descriptive status, so the v1 hot path can keep running
// regardless of analyzer health.

import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  SEMANTIC_ANALYZER_KEYWORD_SIGNALS_LIMIT,
  SEMANTIC_ANALYZER_MAX_ATTEMPTS,
  SEMANTIC_ANALYZER_MAX_TOKENS,
  SEMANTIC_ANALYZER_MESSAGE_TRUNCATE_CHARS,
  SEMANTIC_ANALYZER_RAW_OUTPUT_MAX_CHARS,
  SEMANTIC_ANALYZER_RECENT_MESSAGES_LIMIT,
  SEMANTIC_ANALYZER_RETRY_PROMPT,
  SEMANTIC_ANALYZER_SYSTEM_PROMPT,
  SEMANTIC_ANALYZER_TIMEOUT_MS,
} from '../constants/semantic-intent-analyzer.constants';
import { semanticIntentAnalysisSchema } from '../schemas/semantic-intent-analysis.schema';
import type {
  OllamaGenerateAnalyzerResponse,
  SemanticAnalysisStatus,
  SemanticIntentAnalysis,
  SemanticIntentAnalysisRecord,
  SemanticIntentAnalyzerInput,
} from '../types/semantic-intent-analysis.types';

@Injectable()
export class SemanticIntentAnalyzerManager {
  private readonly logger = new Logger(SemanticIntentAnalyzerManager.name);

  // Runs the analyzer end-to-end. Always returns a record — failures
  // surface in the `status` field rather than throwing.
  async analyze(input: SemanticIntentAnalyzerInput): Promise<SemanticIntentAnalysisRecord> {
    const start = Date.now();
    const config = AppConfig.get();

    if (!config.ROUTING_SEMANTIC_ANALYZER_ENABLED) {
      return this.buildSkipped('SKIPPED_FLAG_DISABLED', config.OLLAMA_ROUTER_MODEL, start);
    }

    this.logger.debug(
      `analyze: starting for thread=${input.threadId} routingMode=${input.routingMode} signals=${String(input.keywordSignals.length)}`,
    );

    const userPrompt = this.buildUserPrompt(input);
    let lastRaw = '';
    let attempts = 0;

    while (attempts < SEMANTIC_ANALYZER_MAX_ATTEMPTS) {
      attempts += 1;
      const isRetry = attempts > 1;
      const fullPrompt = isRetry
        ? `${SEMANTIC_ANALYZER_SYSTEM_PROMPT}\n\n${SEMANTIC_ANALYZER_RETRY_PROMPT}\n\n${userPrompt}\n\nPrevious malformed output:\n${lastRaw.slice(0, 500)}`
        : `${SEMANTIC_ANALYZER_SYSTEM_PROMPT}\n\n${userPrompt}`;

      const callResult = await this.callOllama(fullPrompt, config.OLLAMA_ROUTER_MODEL);
      if (callResult.status !== 'SUCCESS' || callResult.raw === null) {
        // Network / timeout failure — record and stop. Retrying a dead
        // ollama-service does not help and burns the request budget.
        return this.buildFailure(
          callResult.status,
          config.OLLAMA_ROUTER_MODEL,
          attempts,
          start,
          callResult.failureReason,
          lastRaw,
        );
      }

      lastRaw = callResult.raw;
      const parsed = this.parseAndValidate(callResult.raw);
      if (parsed) {
        this.logger.log(
          `analyze: success thread=${input.threadId} attempts=${String(attempts)} risk=${parsed.riskLevel} privacy=${parsed.privacyClass} confidence=${String(parsed.confidence)}`,
        );
        return {
          status: 'SUCCESS',
          analysis: parsed,
          routerModel: config.OLLAMA_ROUTER_MODEL,
          attempts,
          durationMs: Date.now() - start,
        };
      }
    }

    this.logger.warn(
      `analyze: failed after ${String(attempts)} attempts thread=${input.threadId} — JSON invalid`,
    );
    return this.buildFailure(
      'INVALID_JSON_AFTER_RETRY',
      config.OLLAMA_ROUTER_MODEL,
      attempts,
      start,
      'Parsed JSON did not match SemanticIntentAnalysis schema after retry',
      lastRaw,
    );
  }

  // Composes the user-side prompt block fed to the analyzer. Kept small
  // and structured so the model can scan it quickly. Recent messages
  // and signals are bounded to protect the prompt token budget.
  private buildUserPrompt(input: SemanticIntentAnalyzerInput): string {
    const lines: string[] = [];
    lines.push(`Current user message:\n"""${input.message.slice(0, 4_000)}"""`);
    lines.push(`Routing mode: ${input.routingMode}`);

    if (input.activePolicyName) {
      lines.push(`Active policy: ${input.activePolicyName}`);
    }

    if (input.followUpDetected) {
      const signals = (input.followUpSignals ?? []).slice(0, 8).join(', ');
      lines.push(`Heuristic follow-up signals: ${signals || '(none)'}`);
    } else {
      lines.push('Heuristic follow-up signals: (none)');
    }

    if (input.threadSummary) {
      lines.push(`Thread summary so far:\n${input.threadSummary.slice(0, 1200)}`);
    }

    if (input.recentMessages && input.recentMessages.length > 0) {
      const slice = input.recentMessages.slice(-SEMANTIC_ANALYZER_RECENT_MESSAGES_LIMIT);
      const messageLines = slice.map(
        (m) => `[${m.role}] ${m.content.slice(0, SEMANTIC_ANALYZER_MESSAGE_TRUNCATE_CHARS)}`,
      );
      lines.push(`Recent thread (oldest first):\n${messageLines.join('\n')}`);
    }

    if (input.keywordSignals.length > 0) {
      const trimmedSignals = input.keywordSignals
        .slice(0, SEMANTIC_ANALYZER_KEYWORD_SIGNALS_LIMIT)
        .map(
          (s) =>
            `- ${s.category} (boost=${s.confidenceBoost.toFixed(2)}): ${s.matchedTerms.slice(0, 5).join(', ')}`,
        )
        .join('\n');
      lines.push(`Weak keyword hints (do NOT blindly trust):\n${trimmedSignals}`);
    }

    if (input.attachmentMetadata && input.attachmentMetadata.length > 0) {
      const att = input.attachmentMetadata
        .slice(0, 8)
        .map((a) => `- ${a.fileName ?? '(unnamed)'} (${a.mimeType ?? 'unknown'})`)
        .join('\n');
      lines.push(`Attachments:\n${att}`);
    }

    if (input.availableWorkflowKinds && input.availableWorkflowKinds.length > 0) {
      lines.push(`Available workflows: ${input.availableWorkflowKinds.join(', ')}`);
    }

    return lines.join('\n\n');
  }

  // Wraps a single Ollama generate call. Returns a normalized shape so
  // the retry loop doesn't have to know about HTTP details.
  private async callOllama(
    prompt: string,
    routerModel: string,
  ): Promise<{ status: SemanticAnalysisStatus; raw: string | null; failureReason?: string }> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<OllamaGenerateAnalyzerResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: routerModel,
          prompt,
          stream: false,
          think: false,
          keepAlive: config.OLLAMA_KEEP_ALIVE,
          options: {
            temperature: 0,
            num_predict: SEMANTIC_ANALYZER_MAX_TOKENS,
          },
        },
        timeoutMs: SEMANTIC_ANALYZER_TIMEOUT_MS,
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

  // Extracts the first JSON object and validates against the schema.
  // Returns null on any failure so the caller can retry.
  private parseAndValidate(raw: string): SemanticIntentAnalysis | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.debug('parseAndValidate: no JSON object in model output');
        return null;
      }
      const candidate = JSON.parse(jsonMatch[0]) as unknown;
      const result = semanticIntentAnalysisSchema.safeParse(candidate);
      if (!result.success) {
        this.logger.debug(`parseAndValidate: zod failure — ${result.error.issues.length} issues`);
        return null;
      }
      return result.data as SemanticIntentAnalysis;
    } catch {
      this.logger.debug('parseAndValidate: JSON.parse threw');
      return null;
    }
  }

  private buildSkipped(
    status: SemanticAnalysisStatus,
    routerModel: string,
    start: number,
  ): SemanticIntentAnalysisRecord {
    return {
      status,
      analysis: null,
      routerModel,
      attempts: 0,
      durationMs: Date.now() - start,
    };
  }

  private buildFailure(
    status: SemanticAnalysisStatus,
    routerModel: string,
    attempts: number,
    start: number,
    failureReason: string | undefined,
    lastRaw: string,
  ): SemanticIntentAnalysisRecord {
    return {
      status,
      analysis: null,
      rawOutputExcerpt:
        lastRaw.length > 0 ? lastRaw.slice(0, SEMANTIC_ANALYZER_RAW_OUTPUT_MAX_CHARS) : undefined,
      routerModel,
      attempts,
      durationMs: Date.now() - start,
      failureReason,
    };
  }
}
