import { Injectable, Logger } from '@nestjs/common';
import { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';

import { OLLAMA_PROVIDER } from '../../../common/constants';
import { JudgeDecision } from '../../../common/enums';
import { parseJudgeModel, recordGet } from '../../../common/utilities';
import {
  CRITIC_CLOUD_MODELS,
  CRITIC_LOCAL_MODEL,
  CRITIC_SYSTEM_PROMPTS,
  JUDGE_CONFIDENCE_THRESHOLD,
  JUDGE_LOCAL_MODEL,
  JUDGE_REFEREE_AUTO_CATEGORIES,
  JUDGE_SYSTEM_PROMPT,
} from '../constants/judge-referee.constants';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from '../types/execution.types';
import type {
  CriticEvaluation,
  JudgeRefereeConfig,
  JudgeRefereeMetadata,
  JudgeRefereeResult,
  JudgeResponseType,
  JudgeReviewPayload,
  JudgeTokenUsage,
  JudgeVerdict,
  ParsedJudgeVerdict,
} from '../types/judge-referee.types';
import type { ParsedJudgeModel } from '../../../common/types';
import { ChatExecutionManager } from './chat-execution.manager';
import { ChatStreamService } from '../services/chat-stream.service';

@Injectable()
export class JudgeRefereeManager {
  private readonly logger = new Logger(JudgeRefereeManager.name);

  constructor(
    private readonly chatStreamService: ChatStreamService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  private executionManager: ChatExecutionManager | null = null;

  setExecutionManager(manager: ChatExecutionManager): void {
    this.executionManager = manager;
  }

  shouldActivate(config: JudgeRefereeConfig): boolean {
    if (config.enabled) {
      return true;
    }
    if (config.category && JUDGE_REFEREE_AUTO_CATEGORIES.has(config.category)) {
      return true;
    }
    return false;
  }

  async evaluate(
    response: LlmResponse,
    context: AssembledContext,
    config: JudgeRefereeConfig,
    payload: MessageRoutedData,
    threadSettings?: ThreadSettings,
  ): Promise<JudgeRefereeResult> {
    const startTime = Date.now();
    this.logger.log(
      `evaluate: starting judge-referee for ${payload.messageId} category=${config.category ?? 'none'}`,
    );

    const criticModelInfo = await this.selectCriticModel(response.provider, config.isLocalOnly);
    const criticModelLabel = `${criticModelInfo.provider}/${criticModelInfo.model}`;
    const overrideJudgeModel = threadSettings?.judgeModel ?? null;
    // Feature 1 — a user-chosen cloud connector model now runs through the
    // normal provider path. AUTO / unset keeps the local-first default.
    const judgeTarget = await this.resolveJudgeTarget(overrideJudgeModel ?? JUDGE_LOCAL_MODEL);
    const judgeModelLabel = `${judgeTarget.provider}/${judgeTarget.model}`;
    this.chatStreamService.emitJudgeEvaluating(payload.threadId, criticModelLabel, judgeModelLabel);

    const criticEvaluation = await this.callCriticWithModel(
      response,
      context,
      config,
      criticModelInfo,
    );

    const judgeVerdict = await this.callJudge(
      response,
      criticEvaluation,
      context,
      config,
      judgeTarget,
    );

    const totalLatencyMs = Date.now() - startTime;
    this.logger.log(
      `evaluate: verdict=${judgeVerdict.decision} confidence=${String(judgeVerdict.confidence.toFixed(2))} totalLatencyMs=${String(totalLatencyMs)}`,
    );

    const result: JudgeRefereeResult = {
      originalResponse: response,
      criticEvaluation,
      judgeVerdict,
      totalLatencyMs,
      tokenUsage: this.buildJudgeTokenUsage(criticEvaluation, judgeVerdict),
    };

    if (judgeVerdict.decision === JudgeDecision.REVISE && this.executionManager) {
      result.revisedResponse = await this.attemptRevision(
        response,
        criticEvaluation,
        context,
        payload,
        threadSettings,
      );
    }

    if (
      judgeVerdict.decision === JudgeDecision.ESCALATE &&
      judgeVerdict.response.trim().length > 0
    ) {
      result.escalatedResponse = {
        content: judgeVerdict.response,
        provider: judgeTarget.provider,
        model: judgeTarget.model,
        latencyMs: judgeVerdict.latencyMs,
        usedFallback: false,
      };
    }

    return result;
  }

  buildMetadata(result: JudgeRefereeResult): JudgeRefereeMetadata {
    const judgeReview = this.buildJudgeReviewPayload(result);

    return {
      judgeEnabled: true,
      criticModel: result.criticEvaluation.model,
      criticFeedback: result.criticEvaluation.feedback,
      criticScore: result.criticEvaluation.score,
      judgeModel: result.judgeVerdict.model,
      judgeDecision: result.judgeVerdict.decision,
      judgeReasoning: result.judgeVerdict.reasoning,
      judgeConfidence: result.judgeVerdict.confidence,
      revisionsCount: result.revisedResponse ? 1 : 0,
      judgeTotalLatencyMs: result.totalLatencyMs,
      judgeErrorState: result.judgeVerdict.fallbackState ?? null,
      judgeReview,
      // Feature 2 — judge/critic combined token usage transparency.
      ...(result.tokenUsage === undefined
        ? {}
        : {
            judgeInputTokens: result.tokenUsage.inputTokens,
            judgeOutputTokens: result.tokenUsage.outputTokens,
            judgeTokenEstimated: result.tokenUsage.estimated,
            judgeTokenSource: result.tokenUsage.source,
          }),
    };
  }

  private async callCriticWithModel(
    response: LlmResponse,
    context: AssembledContext,
    config: JudgeRefereeConfig,
    criticModel: { provider: string; model: string },
  ): Promise<CriticEvaluation> {
    const startTime = Date.now();
    const criticPrompt = this.buildCriticPrompt(config.category);

    this.logger.debug(
      `callCritic: using ${criticModel.provider}/${criticModel.model} for category=${config.category ?? 'generic'}`,
    );

    const userPrompt = this.extractUserPrompt(context);
    const criticContext: AssembledContext = {
      ...context,
      systemPrompt: criticPrompt,
      threadMessages: [
        {
          role: 'USER',
          content: `User question: ${userPrompt}\n\nAI response to evaluate:\n${response.content}`,
        } as AssembledContext['threadMessages'][0],
      ],
    };

    try {
      if (!this.executionManager) {
        throw new Error('ExecutionManager not set');
      }
      const criticResponse = await this.executionManager.callProvider(
        criticModel.provider,
        criticModel.model,
        criticContext,
        startTime,
        false,
        undefined,
        undefined,
        undefined,
        TokenLedgerContext.JUDGE,
      );

      const parsed = this.parseCriticOutput(criticResponse.content);
      const latencyMs = Date.now() - startTime;

      return {
        feedback: parsed.feedback,
        score: parsed.score,
        category: config.category ?? 'generic',
        model: `${criticModel.provider}/${criticModel.model}`,
        latencyMs,
        inputTokens: criticResponse.inputTokens,
        outputTokens: criticResponse.outputTokens,
        tokenEstimated: criticResponse.tokenEstimated,
        tokenSource: criticResponse.tokenSource,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`callCritic: failed — ${msg}. Defaulting to pass-through.`);
      return {
        feedback: [],
        score: 1.0,
        category: config.category ?? 'generic',
        model: `${criticModel.provider}/${criticModel.model}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async callJudge(
    response: LlmResponse,
    criticEval: CriticEvaluation,
    context: AssembledContext,
    _config: JudgeRefereeConfig,
    judgeTarget: { provider: string; model: string },
  ): Promise<JudgeVerdict> {
    const startTime = Date.now();
    const judgeLabel = `${judgeTarget.provider}/${judgeTarget.model}`;

    this.logger.debug(`callJudge: using ${judgeLabel}`);

    const judgeContext = this.buildJudgeContext(response, criticEval, context);

    try {
      if (!this.executionManager) {
        throw new Error('ExecutionManager not set');
      }
      // Feature 1 — execute the judge (cloud or local) through the SAME
      // provider path as chat so its token usage is captured + estimated, and
      // tag it with the JUDGE context.
      const judgeResponse = await this.executionManager.callProvider(
        judgeTarget.provider,
        judgeTarget.model,
        judgeContext,
        startTime,
        false,
        undefined,
        undefined,
        undefined,
        TokenLedgerContext.JUDGE,
      );

      const verdict = this.parseJudgeOutput(judgeResponse.content);
      return {
        ...verdict,
        model: judgeLabel,
        latencyMs: Date.now() - startTime,
        inputTokens: judgeResponse.inputTokens,
        outputTokens: judgeResponse.outputTokens,
        tokenEstimated: judgeResponse.tokenEstimated,
        tokenSource: judgeResponse.tokenSource,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`callJudge: failed — ${msg}. Defaulting to ACCEPT.`);
      return {
        decision: JudgeDecision.ACCEPT,
        summary: 'The answer passed review.',
        reasoning: 'Judge unavailable, accepting response',
        confidence: JUDGE_CONFIDENCE_THRESHOLD,
        response: 'The answer passed review because the judge service was unavailable.',
        responseType: 'verification_note',
        recommendedChanges: [],
        model: judgeLabel,
        latencyMs: Date.now() - startTime,
        wasFallback: true,
        fallbackState: 'unavailable',
      };
    }
  }

  private buildJudgeContext(
    response: LlmResponse,
    criticEval: CriticEvaluation,
    context: AssembledContext,
  ): AssembledContext {
    const userPrompt = this.extractUserPrompt(context);
    const judgeInput = [
      `User question: ${userPrompt}`,
      `\nAI response:\n${response.content}`,
      `\nCritic evaluation:`,
      `Score: ${String(criticEval.score)}`,
      `Feedback: ${criticEval.feedback.length > 0 ? criticEval.feedback.join('; ') : 'No issues found'}`,
    ].join('\n');

    return {
      ...context,
      systemPrompt: JUDGE_SYSTEM_PROMPT,
      threadMessages: [
        { role: 'USER', content: judgeInput } as AssembledContext['threadMessages'][0],
      ],
    };
  }

  private buildJudgeReviewPayload(result: JudgeRefereeResult): JudgeReviewPayload {
    const revisedAnswer = result.revisedResponse?.content ?? null;
    const escalatedAnswer = result.escalatedResponse?.content ?? null;
    const judgeResponse =
      escalatedAnswer ??
      revisedAnswer ??
      result.judgeVerdict.response ??
      result.judgeVerdict.summary ??
      result.judgeVerdict.reasoning;
    const judgeResponseType: JudgeResponseType = escalatedAnswer
      ? 'escalated_answer'
      : (revisedAnswer
        ? 'revised_answer'
        : result.judgeVerdict.responseType);

    return {
      version: 1,
      judgeDecision: result.judgeVerdict.decision,
      judgeModel: result.judgeVerdict.model,
      judgeDisplayName: result.judgeVerdict.model,
      judgeConfidence: result.judgeVerdict.confidence,
      judgeReasoning: result.judgeVerdict.reasoning,
      judgeSummary: result.judgeVerdict.summary,
      judgeResponse,
      judgeResponseType,
      criticModel: result.criticEvaluation.model,
      criticDisplayName: result.criticEvaluation.model,
      criticFeedback: result.criticEvaluation.feedback,
      criticScore: result.criticEvaluation.score,
      originalExecutionModel: `${result.originalResponse.provider}/${result.originalResponse.model}`,
      originalExecutionDisplayName: `${result.originalResponse.provider}/${result.originalResponse.model}`,
      originalAnswerSnapshot: result.originalResponse.content,
      revisedAnswer,
      escalatedAnswer,
      judgeLatencyMs: result.judgeVerdict.latencyMs,
      criticLatencyMs: result.criticEvaluation.latencyMs,
      judgeTotalLatencyMs: result.totalLatencyMs,
      judgeMetadata: {
        category: result.criticEvaluation.category,
        recommendedChanges: result.judgeVerdict.recommendedChanges,
      },
      judgeDialogAvailable: result.judgeVerdict.wasFallback !== true,
      generatedAt: new Date().toISOString(),
    };
  }

  private async attemptRevision(
    originalResponse: LlmResponse,
    criticEval: CriticEvaluation,
    context: AssembledContext,
    _payload: MessageRoutedData,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse | undefined> {
    if (!this.executionManager) {
      return undefined;
    }

    this.logger.log('attemptRevision: generating revised response with critic feedback');

    const feedbackText = criticEval.feedback.join('\n- ');
    const revisionInstruction = `The previous response had these issues:\n- ${feedbackText}\n\nPlease regenerate an improved response that addresses all the above feedback.`;

    const revisedContext: AssembledContext = {
      ...context,
      threadMessages: [
        ...context.threadMessages,
        {
          role: 'ASSISTANT',
          content: originalResponse.content,
        } as AssembledContext['threadMessages'][0],
        { role: 'USER', content: revisionInstruction } as AssembledContext['threadMessages'][0],
      ],
    };

    try {
      const revised = await this.executionManager.callProvider(
        originalResponse.provider,
        originalResponse.model,
        revisedContext,
        Date.now(),
        false,
        threadSettings,
        undefined,
        undefined,
        TokenLedgerContext.JUDGE,
      );
      this.logger.log(
        `attemptRevision: revision complete — contentLen=${String(revised.content.length)}`,
      );
      return revised;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`attemptRevision: failed — ${msg}. Returning original.`);
      return undefined;
    }
  }

  async selectCriticModel(
    generatorProvider: string,
    isLocalOnly: boolean,
  ): Promise<{ provider: string; model: string }> {
    if (isLocalOnly) {
      return { provider: OLLAMA_PROVIDER, model: await this.resolveModel(CRITIC_LOCAL_MODEL) };
    }

    const available = CRITIC_CLOUD_MODELS.find((c) => c.provider !== generatorProvider);

    return (
      available ?? { provider: OLLAMA_PROVIDER, model: await this.resolveModel(CRITIC_LOCAL_MODEL) }
    );
  }

  private async resolveModel(model: string): Promise<string> {
    if (model !== 'AUTO') {
      return model;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  // Feature 1 — resolves a user-chosen judge/critic selection into a concrete
  // execution target. A `PROVIDER:model` string with a known cloud/connector
  // provider routes through that provider (so tokens are captured + recorded);
  // a plain model name keeps the local-first Ollama behavior. AUTO / empty
  // falls back to the resolved local default model.
  private async resolveJudgeTarget(rawModel: string): Promise<{ provider: string; model: string }> {
    const parsed: ParsedJudgeModel = parseJudgeModel(rawModel);
    if (parsed.provider !== null) {
      const isOllamaLocal = parsed.provider === OLLAMA_PROVIDER;
      return {
        provider: parsed.provider,
        model: isOllamaLocal ? await this.resolveModel(parsed.model) : parsed.model,
      };
    }
    const localModel = parsed.model.length > 0 ? parsed.model : 'AUTO';
    return { provider: OLLAMA_PROVIDER, model: await this.resolveModel(localModel) };
  }

  // Feature 2 — combines critic + judge token usage into a single JUDGE-context
  // ledger entry. Treats a missing side as 0 and downgrades the source to MIXED
  // when one half was estimated and the other native.
  private buildJudgeTokenUsage(
    critic: CriticEvaluation,
    judge: JudgeVerdict,
  ): JudgeTokenUsage {
    const criticEstimated = critic.tokenEstimated ?? false;
    const judgeEstimated = judge.tokenEstimated ?? false;
    const criticSource = critic.tokenSource ?? TokenUsageSource.ESTIMATED;
    const judgeSource = judge.tokenSource ?? TokenUsageSource.ESTIMATED;
    const allNative =
      criticSource === TokenUsageSource.NATIVE && judgeSource === TokenUsageSource.NATIVE;
    const allEstimated =
      criticSource === TokenUsageSource.ESTIMATED && judgeSource === TokenUsageSource.ESTIMATED;
    const source = allNative
      ? TokenUsageSource.NATIVE
      : (allEstimated ? TokenUsageSource.ESTIMATED : TokenUsageSource.MIXED);
    return {
      inputTokens: (critic.inputTokens ?? 0) + (judge.inputTokens ?? 0),
      outputTokens: (critic.outputTokens ?? 0) + (judge.outputTokens ?? 0),
      estimated: criticEstimated || judgeEstimated,
      source,
    };
  }

  private buildCriticPrompt(category: string | undefined): string {
    const generic = recordGet(CRITIC_SYSTEM_PROMPTS, 'generic') ?? '';
    if (!category) {
      return generic;
    }
    const complianceCategories = new Set(['medical', 'legal', 'finance']);
    if (complianceCategories.has(category)) {
      return recordGet(CRITIC_SYSTEM_PROMPTS, 'compliance') ?? '';
    }
    return recordGet(CRITIC_SYSTEM_PROMPTS, category) ?? generic;
  }

  private parseJudgePlainTextOutput(content: string): ParsedJudgeVerdict | null {
    const normalizedContent = content.trim();
    if (normalizedContent.length === 0) {
      return null;
    }

    const decision = this.inferJudgeDecision(normalizedContent);
    const summary = this.buildJudgeSummary(normalizedContent);
    const responseType: JudgeResponseType =
      decision === JudgeDecision.ESCALATE
        ? 'escalated_answer'
        : (decision === JudgeDecision.REVISE
          ? 'summary'
          : 'verification_note');

    return {
      decision,
      summary,
      reasoning: normalizedContent,
      confidence: JUDGE_CONFIDENCE_THRESHOLD,
      response: normalizedContent,
      responseType,
      recommendedChanges: [],
    };
  }

  private inferJudgeDecision(content: string): JudgeDecision {
    const normalized = content.toLowerCase();

    const escalateHints = [
      'escalate',
      'stronger answer',
      'replace the answer',
      'fundamentally flawed',
      'dangerous advice',
      'needs a stronger',
    ];
    if (escalateHints.some((hint) => normalized.includes(hint))) {
      return JudgeDecision.ESCALATE;
    }

    const reviseHints = [
      'revise',
      'needs revision',
      'needs work',
      'fix',
      'improve',
      'missing',
      'incomplete',
    ];
    if (reviseHints.some((hint) => normalized.includes(hint))) {
      return JudgeDecision.REVISE;
    }

    return JudgeDecision.ACCEPT;
  }

  private buildJudgeSummary(content: string): string {
    const normalized = content.replaceAll(/\s+/g, ' ').trim();
    const firstSentence = normalized.split(/(?<=[.!?])\s+/u)[0]?.trim();

    if (firstSentence && firstSentence.length > 0) {
      return firstSentence.slice(0, 180);
    }

    return normalized.slice(0, 180);
  }

  parseJudgeOutput(content: string): ParsedJudgeVerdict {
    try {
      const parsed = this.extractJudgeJsonOrThrow(content);
      const decision = parsed['decision'];
      this.assertValidDecision(decision);
      return this.buildParsedVerdict(parsed, decision as JudgeDecision);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Parse error';
      this.logger.warn(`parseJudgeOutput: failed to parse — ${msg}. Defaulting to ACCEPT.`);
      const plainVerdict = this.parseJudgePlainTextOutput(content);
      if (plainVerdict) {
        return plainVerdict;
      }
      return {
        decision: JudgeDecision.ACCEPT,
        summary: 'The judge completed a review of the answer.',
        reasoning: 'Could not parse judge output, accepting by default',
        confidence: JUDGE_CONFIDENCE_THRESHOLD,
        response: 'The answer passed review.',
        responseType: 'verification_note',
        recommendedChanges: [],
        wasFallback: true,
        fallbackState: 'failed',
      };
    }
  }

  private extractJudgeJsonOrThrow(content: string): Record<string, unknown> {
    let jsonStr = content.trim();
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(jsonStr);
    if (codeBlockMatch?.[1]) {
      jsonStr = codeBlockMatch[1].trim();
    }
    const jsonMatch = /\{[\s\S]*\}/.exec(jsonStr);
    if (!jsonMatch) {
      throw new Error('No JSON object found');
    }
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  }

  private assertValidDecision(decision: unknown): void {
    if (
      decision !== JudgeDecision.ACCEPT &&
      decision !== JudgeDecision.REVISE &&
      decision !== JudgeDecision.ESCALATE
    ) {
      throw new Error(`Invalid decision: ${String(decision)}`);
    }
  }

  private buildParsedVerdict(
    parsed: Record<string, unknown>,
    decision: JudgeDecision,
  ): ParsedJudgeVerdict {
    const summary = parsed['summary'];
    const reasoning = parsed['reasoning'];
    const confidence = parsed['confidence'];
    const response = parsed['response'];
    const responseType = parsed['responseType'];
    const recommendedChangesRaw = parsed['recommendedChanges'];
    return {
      decision,
      summary:
        typeof summary === 'string' && summary.trim().length > 0
          ? summary
          : 'The judge completed a review of the answer.',
      reasoning: typeof reasoning === 'string' ? reasoning : 'No reasoning provided',
      confidence:
        typeof confidence === 'number'
          ? Math.max(0, Math.min(1, confidence))
          : JUDGE_CONFIDENCE_THRESHOLD,
      response:
        typeof response === 'string' && response.trim().length > 0
          ? response
          : (decision === JudgeDecision.ESCALATE
            ? 'A stronger answer is required for this request.'
            : 'The answer passed review.'),
      responseType: this.resolveJudgeResponseType(responseType, decision),
      recommendedChanges: Array.isArray(recommendedChangesRaw)
        ? recommendedChangesRaw.filter(
            (change): change is string => typeof change === 'string' && change.trim().length > 0,
          )
        : [],
    };
  }

  private resolveJudgeResponseType(
    responseType: unknown,
    decision: JudgeDecision,
  ): JudgeResponseType {
    if (
      responseType === 'summary' ||
      responseType === 'revised_answer' ||
      responseType === 'escalated_answer' ||
      responseType === 'verification_note'
    ) {
      return responseType;
    }
    return decision === JudgeDecision.ESCALATE ? 'escalated_answer' : 'verification_note';
  }

  private parseCriticOutput(content: string): { feedback: string[]; score: number } {
    try {
      let jsonStr = content.trim();

      const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(jsonStr);
      if (codeBlockMatch?.[1]) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const jsonMatch = /\{[\s\S]*\}/.exec(jsonStr);
      if (!jsonMatch) {
        throw new Error('No JSON object found');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const feedback = Array.isArray(parsed['feedback'])
        ? (parsed['feedback'] as unknown[]).filter((f): f is string => typeof f === 'string')
        : [];
      const score =
        typeof parsed['score'] === 'number' ? Math.max(0, Math.min(1, parsed['score'])) : 0.5;

      return { feedback, score };
    } catch {
      this.logger.warn('parseCriticOutput: failed to parse critic output. Defaulting to pass.');
      return { feedback: [], score: 1.0 };
    }
  }

  private extractUserPrompt(context: AssembledContext): string {
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    return lastUserMsg?.content ?? '';
  }
}
