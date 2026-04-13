import { Injectable, Logger } from '@nestjs/common';

import { OLLAMA_PROVIDER } from '../../../common/constants';
import { JudgeDecision } from '../../../common/enums';
import {
  CRITIC_CLOUD_MODELS,
  CRITIC_LOCAL_MODEL,
  CRITIC_SYSTEM_PROMPTS,
  JUDGE_CONFIDENCE_THRESHOLD,
  JUDGE_LOCAL_MODEL,
  JUDGE_REFEREE_AUTO_CATEGORIES,
  JUDGE_SYSTEM_PROMPT,
} from '../constants/judge-referee.constants';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from '../types/execution.types';
import type {
  CriticEvaluation,
  JudgeRefereeConfig,
  JudgeRefereeMetadata,
  JudgeRefereeResult,
  JudgeVerdict,
  ParsedJudgeVerdict,
} from '../types/judge-referee.types';
import { ChatExecutionManager } from './chat-execution.manager';
import { ChatStreamService } from '../services/chat-stream.service';

@Injectable()
export class JudgeRefereeManager {
  private readonly logger = new Logger(JudgeRefereeManager.name);

  constructor(private readonly chatStreamService: ChatStreamService) {}

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

    const criticModelInfo = this.selectCriticModel(response.provider, config.isLocalOnly);
    const criticModelLabel = `${criticModelInfo.provider}/${criticModelInfo.model}`;
    const overrideJudgeModel = threadSettings?.judgeModel ?? null;
    const effectiveJudgeModel = overrideJudgeModel ?? JUDGE_LOCAL_MODEL;
    const judgeModelLabel = `local-ollama/${effectiveJudgeModel}`;
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
      effectiveJudgeModel,
    );

    const totalLatencyMs = Date.now() - startTime;
    this.logger.log(
      `evaluate: verdict=${judgeVerdict.decision} confidence=${String(judgeVerdict.confidence.toFixed(2))} totalLatencyMs=${String(totalLatencyMs)}`,
    );

    const result: JudgeRefereeResult = {
      criticEvaluation,
      judgeVerdict,
      totalLatencyMs,
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

    return result;
  }

  buildMetadata(result: JudgeRefereeResult): JudgeRefereeMetadata {
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
      );

      const parsed = this.parseCriticOutput(criticResponse.content);
      const latencyMs = Date.now() - startTime;

      return {
        feedback: parsed.feedback,
        score: parsed.score,
        category: config.category ?? 'generic',
        model: `${criticModel.provider}/${criticModel.model}`,
        latencyMs,
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
    judgeModelOverride?: string,
  ): Promise<JudgeVerdict> {
    const startTime = Date.now();
    const judgeModel = judgeModelOverride ?? JUDGE_LOCAL_MODEL;

    this.logger.debug(`callJudge: using ${OLLAMA_PROVIDER}/${judgeModel}`);

    const userPrompt = this.extractUserPrompt(context);
    const judgeInput = [
      `User question: ${userPrompt}`,
      `\nAI response:\n${response.content}`,
      `\nCritic evaluation:`,
      `Score: ${String(criticEval.score)}`,
      `Feedback: ${criticEval.feedback.length > 0 ? criticEval.feedback.join('; ') : 'No issues found'}`,
    ].join('\n');

    const judgeContext: AssembledContext = {
      ...context,
      systemPrompt: JUDGE_SYSTEM_PROMPT,
      threadMessages: [
        { role: 'USER', content: judgeInput } as AssembledContext['threadMessages'][0],
      ],
    };

    try {
      if (!this.executionManager) {
        throw new Error('ExecutionManager not set');
      }
      const judgeResponse = await this.executionManager.callProvider(
        OLLAMA_PROVIDER,
        judgeModel,
        judgeContext,
        startTime,
        false,
      );

      const verdict = this.parseJudgeOutput(judgeResponse.content);
      return {
        ...verdict,
        model: `${OLLAMA_PROVIDER}/${judgeModel}`,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`callJudge: failed — ${msg}. Defaulting to ACCEPT.`);
      return {
        decision: JudgeDecision.ACCEPT,
        reasoning: 'Judge unavailable, accepting response',
        confidence: JUDGE_CONFIDENCE_THRESHOLD,
        model: `${OLLAMA_PROVIDER}/${judgeModel}`,
        latencyMs: Date.now() - startTime,
      };
    }
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

  selectCriticModel(
    generatorProvider: string,
    isLocalOnly: boolean,
  ): { provider: string; model: string } {
    if (isLocalOnly) {
      return { provider: OLLAMA_PROVIDER, model: CRITIC_LOCAL_MODEL };
    }

    const available = CRITIC_CLOUD_MODELS.find((c) => c.provider !== generatorProvider);

    return available ?? { provider: OLLAMA_PROVIDER, model: CRITIC_LOCAL_MODEL };
  }

  private buildCriticPrompt(category: string | undefined): string {
    if (!category) {
      return CRITIC_SYSTEM_PROMPTS['generic'] ?? '';
    }

    const complianceCategories = new Set(['medical', 'legal', 'finance']);
    if (complianceCategories.has(category)) {
      return CRITIC_SYSTEM_PROMPTS['compliance'] ?? '';
    }

    return CRITIC_SYSTEM_PROMPTS[category] ?? CRITIC_SYSTEM_PROMPTS['generic'] ?? '';
  }

  parseJudgeOutput(content: string): ParsedJudgeVerdict {
    try {
      let jsonStr = content.trim();

      // Strip markdown code block if present
      const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(jsonStr);
      if (codeBlockMatch?.[1]) {
        jsonStr = codeBlockMatch[1].trim();
      }

      // Extract JSON object from the string
      const jsonMatch = /\{[\s\S]*\}/.exec(jsonStr);
      if (!jsonMatch) {
        throw new Error('No JSON object found');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const decision = parsed['decision'];
      const reasoning = parsed['reasoning'];
      const confidence = parsed['confidence'];

      if (
        decision !== JudgeDecision.ACCEPT &&
        decision !== JudgeDecision.REVISE &&
        decision !== JudgeDecision.ESCALATE
      ) {
        throw new Error(`Invalid decision: ${String(decision)}`);
      }

      return {
        decision,
        reasoning: typeof reasoning === 'string' ? reasoning : 'No reasoning provided',
        confidence:
          typeof confidence === 'number'
            ? Math.max(0, Math.min(1, confidence))
            : JUDGE_CONFIDENCE_THRESHOLD,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Parse error';
      this.logger.warn(`parseJudgeOutput: failed to parse — ${msg}. Defaulting to ACCEPT.`);
      return {
        decision: JudgeDecision.ACCEPT,
        reasoning: 'Could not parse judge output, accepting by default',
        confidence: JUDGE_CONFIDENCE_THRESHOLD,
      };
    }
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
