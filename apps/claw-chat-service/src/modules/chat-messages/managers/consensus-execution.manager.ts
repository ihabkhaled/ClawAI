import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { ConsensusConfidenceLevel } from '../../../common/enums/consensus-confidence.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  CONSENSUS_MIN_CONTENT_LENGTH,
  CONSENSUS_SYNTHESIS_TIMEOUT_MS,
} from '../constants/consensus.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type {
  ConsensusAnalysis,
  ConsensusModelBreakdown,
  ConsensusResponse,
  ConsensusSynthesisResult,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
} from '../types/consensus.types';
import type { ParallelModelResponse, ParallelModelTarget } from '../types/parallel.types';
import type { AssembledContext } from '../types/context.types';
import type { ThreadSettings } from '../types/execution.types';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { type ChatThread } from '../../../generated/prisma';

@Injectable()
export class ConsensusExecutionManager {
  private readonly logger = new Logger(ConsensusExecutionManager.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {
    this.timeoutMs = AppConfig.get().OLLAMA_GENERATE_TIMEOUT_MS;
  }

  async executeConsensus(
    userId: string,
    threadId: string,
    content: string,
    models: ParallelModelTarget[],
    fileIds?: string[],
  ): Promise<ConsensusResponse> {
    this.logger.log(
      `executeConsensus: queuing ${String(models.length)} models in thread ${threadId}`,
    );

    const userMessage = await this.storeUserMessage(threadId, content, fileIds);

    void this.executeInBackground(userId, threadId, userMessage.id, content, models, fileIds);

    return { messageId: userMessage.id, threadId, prompt: content };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    consensusGroupId: string,
    content: string,
    models: ParallelModelTarget[],
    fileIds?: string[],
  ): Promise<void> {
    try {
      const { context, threadSettings } = await this.buildContext(userId, threadId, fileIds);
      const responses = await this.executeAllModels(models, context, threadSettings);
      const completedResponses = responses.filter((r) => r.status === 'completed');

      await this.storeModelMessages(threadId, consensusGroupId, responses);

      const synthesis = await this.synthesize(content, completedResponses, models);
      await this.storeSynthesisMessage(threadId, consensusGroupId, synthesis);

      this.logger.log(
        `executeInBackground: consensus done — ${String(completedResponses.length)}/${String(responses.length)} completed, score=${String(synthesis.analysis.agreementScore.toFixed(2))}`,
      );
      this.chatStreamService.emitCompletion(threadId, 'consensus', 'consensus');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: consensus failed — ${msg}`);
      await this.storeSynthesisMessage(
        threadId,
        consensusGroupId,
        this.buildFallbackSynthesis(msg),
      );
      this.chatStreamService.emitError(threadId, `Consensus execution failed: ${msg}`);
    }
  }

  private async buildContext(
    userId: string,
    threadId: string,
    fileIds?: string[],
  ): Promise<{ context: AssembledContext; threadSettings: ThreadSettings | undefined }> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    const threadSettings = this.extractThreadSettings(thread);
    const threadMessages = await this.chatMessagesRepository.findRecentByThreadId(threadId, 20);
    const chronologicalMessages = [...threadMessages].reverse();
    const context = await this.contextAssemblyManager.assemble(
      userId,
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );
    return { context, threadSettings };
  }

  private async executeAllModels(
    models: ParallelModelTarget[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse[]> {
    const promises = models.map((target) =>
      this.executeWithTimeout(target, context, threadSettings),
    );
    const settled = await Promise.allSettled(promises);
    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const target = models.at(index);
      return this.buildFailedResponse(
        target?.provider ?? 'unknown',
        target?.model ?? 'unknown',
        result.reason instanceof Error ? result.reason.message : 'Promise rejected',
      );
    });
  }

  private async executeWithTimeout(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse> {
    const modelPromise = this.executeSingleModel(target, context, threadSettings);
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(
        () => reject(new Error(`Timeout after ${String(this.timeoutMs)}ms`)),
        this.timeoutMs,
      );
    });

    try {
      return await Promise.race([modelPromise, timeoutPromise]);
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && error.message.includes('Timeout after');
      if (isTimeout) {
        return this.buildTimedOutResponse(target.provider, target.model);
      }
      throw error;
    }
  }

  private async executeSingleModel(
    target: ParallelModelTarget,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse> {
    const startTime = Date.now();
    try {
      const llmResponse = await this.chatExecutionManager.callProvider(
        target.provider,
        target.model,
        context,
        startTime,
        false,
        threadSettings,
      );
      return {
        provider: llmResponse.provider,
        model: llmResponse.model,
        content: llmResponse.content,
        latencyMs: llmResponse.latencyMs,
        inputTokens: llmResponse.inputTokens ?? null,
        outputTokens: llmResponse.outputTokens ?? null,
        status: 'completed',
        errorMessage: null,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.buildFailedResponse(
        target.provider,
        target.model,
        errorMessage,
        Date.now() - startTime,
      );
    }
  }

  private async synthesize(
    prompt: string,
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
  ): Promise<ConsensusSynthesisResult> {
    if (completedResponses.length === 0) {
      return this.buildFallbackSynthesis('No models produced a valid response');
    }
    if (completedResponses.length === 1) {
      const singleResponse = completedResponses[0];
      if (singleResponse) {
        return this.buildSingleResponseSynthesis(singleResponse, allModels);
      }
    }
    try {
      return await this.runOllamaSynthesis(prompt, completedResponses, allModels);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Synthesis failed';
      this.logger.warn(`synthesize: Ollama synthesis failed, using heuristic — ${msg}`);
      return this.buildHeuristicSynthesis(completedResponses, allModels);
    }
  }

  private async runOllamaSynthesis(
    prompt: string,
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
  ): Promise<ConsensusSynthesisResult> {
    const config = AppConfig.get();
    const responseList = completedResponses
      .map(
        (r, i) =>
          `Response ${String(i + 1)} (${r.provider}/${r.model}):\n${r.content.slice(0, 2000)}`,
      )
      .join('\n\n---\n\n');

    const synthesisPrompt = this.buildSynthesisPrompt(
      prompt,
      responseList,
      completedResponses.length,
    );
    const requestBody: OllamaGenerateRequest = {
      model: await this.resolveModel(),
      prompt: synthesisPrompt,
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 800 },
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: CONSENSUS_SYNTHESIS_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama synthesis returned status ${String(response.status)}`);
    }

    const parsed = this.parseSynthesisJson(response.data.response);
    return this.buildSynthesisResult(parsed, completedResponses, allModels);
  }

  private buildSynthesisPrompt(
    originalPrompt: string,
    responseList: string,
    count: number,
  ): string {
    return `You are a consensus analyzer. Analyze ${String(count)} AI responses to a prompt and create a merged synthesis.

ORIGINAL PROMPT: ${originalPrompt.slice(0, 500)}

MODEL RESPONSES:
${responseList}

Return ONLY valid JSON, no markdown, no explanation:
{"finalAnswer":"merged answer","agreementScore":0.8,"agreements":["point1","point2"],"disagreements":["diff1"],"contradictions":[],"confidenceLevel":"HIGH","synthesisRationale":"brief reason"}

Rules: agreementScore 0.0-1.0, confidenceLevel must be HIGH/MEDIUM/LOW, max 3 items per array.`;
  }

  private parseSynthesisJson(raw: string): Record<string, unknown> {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private buildSynthesisResult(
    parsed: Record<string, unknown>,
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
  ): ConsensusSynthesisResult {
    const bestResponse = completedResponses.reduce((best, cur) =>
      cur.content.length > best.content.length ? cur : best,
    );

    const analysis: ConsensusAnalysis = {
      agreementScore: this.clampScore(parsed['agreementScore']),
      agreements: this.toStringArray(parsed['agreements']),
      disagreements: this.toStringArray(parsed['disagreements']),
      contradictions: this.toStringArray(parsed['contradictions']),
      confidenceLevel: this.parseConfidenceLevel(parsed['confidenceLevel']),
      synthesisRationale:
        typeof parsed['synthesisRationale'] === 'string'
          ? parsed['synthesisRationale']
          : 'Synthesized from all responses',
    };

    const finalAnswer =
      typeof parsed['finalAnswer'] === 'string' &&
      parsed['finalAnswer'].length > CONSENSUS_MIN_CONTENT_LENGTH
        ? parsed['finalAnswer']
        : bestResponse.content;

    return {
      finalAnswer,
      analysis,
      modelBreakdown: this.buildModelBreakdown(completedResponses, allModels),
    };
  }

  private buildHeuristicSynthesis(
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
  ): ConsensusSynthesisResult {
    const bestResponse = completedResponses.reduce((best, cur) =>
      cur.content.length > best.content.length ? cur : best,
    );
    const score = Math.max(0.3, 1 - (completedResponses.length - 1) * 0.1);

    return {
      finalAnswer: bestResponse.content,
      analysis: {
        agreementScore: this.clampScore(score),
        agreements: ['Multiple models provided responses'],
        disagreements: completedResponses.length > 1 ? ['Models varied in response depth'] : [],
        contradictions: [],
        confidenceLevel: ConsensusConfidenceLevel.MEDIUM,
        synthesisRationale: 'Heuristic synthesis: selected longest response as final answer',
      },
      modelBreakdown: this.buildModelBreakdown(completedResponses, allModels),
    };
  }

  private buildSingleResponseSynthesis(
    response: ParallelModelResponse,
    allModels: ParallelModelTarget[],
  ): ConsensusSynthesisResult {
    return {
      finalAnswer: response.content,
      analysis: {
        agreementScore: 1.0,
        agreements: ['Only one model produced a valid response'],
        disagreements: [],
        contradictions: [],
        confidenceLevel: ConsensusConfidenceLevel.LOW,
        synthesisRationale: 'Single model responded; no consensus computation possible',
      },
      modelBreakdown: this.buildModelBreakdown([response], allModels),
    };
  }

  private buildFallbackSynthesis(errorMessage: string): ConsensusSynthesisResult {
    return {
      finalAnswer: `Consensus synthesis failed: ${errorMessage}`,
      analysis: {
        agreementScore: 0,
        agreements: [],
        disagreements: [],
        contradictions: [],
        confidenceLevel: ConsensusConfidenceLevel.LOW,
        synthesisRationale: 'Synthesis failed due to execution error',
      },
      modelBreakdown: [],
    };
  }

  private buildModelBreakdown(
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
  ): ConsensusModelBreakdown[] {
    const completedKeys = new Set(completedResponses.map((r) => `${r.provider}/${r.model}`));
    return allModels.map((m) => {
      const key = `${m.provider}/${m.model}`;
      const resp = completedResponses.find((r) => `${r.provider}/${r.model}` === key);
      return {
        provider: m.provider,
        model: m.model,
        contentLength: resp?.content.length ?? 0,
        status: completedKeys.has(key) ? 'completed' : 'failed',
      };
    });
  }

  private async storeUserMessage(
    threadId: string,
    content: string,
    fileIds?: string[],
  ): Promise<{ id: string }> {
    const metadata = fileIds && fileIds.length > 0 ? { fileIds } : undefined;
    return this.chatMessagesRepository.create({ threadId, role: 'USER', content, metadata });
  }

  private async storeModelMessages(
    threadId: string,
    consensusGroupId: string,
    responses: ParallelModelResponse[],
  ): Promise<void> {
    const storePromises = responses.map((r) =>
      this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: r.status === 'completed' ? r.content : `Error: ${r.errorMessage ?? 'Unknown'}`,
        provider: r.provider,
        model: r.model,
        inputTokens: r.inputTokens ?? undefined,
        outputTokens: r.outputTokens ?? undefined,
        latencyMs: r.latencyMs,
        usedFallback: false,
        metadata: { consensusExecution: true, consensusGroupId, status: r.status },
      }),
    );
    await Promise.all(storePromises);
  }

  private async storeSynthesisMessage(
    threadId: string,
    consensusGroupId: string,
    synthesis: ConsensusSynthesisResult,
  ): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: synthesis.finalAnswer,
      provider: 'consensus',
      model: 'synthesis',
      usedFallback: false,
      metadata: {
        consensusSynthesis: true,
        consensusGroupId,
        agreementScore: synthesis.analysis.agreementScore,
        agreements: synthesis.analysis.agreements,
        disagreements: synthesis.analysis.disagreements,
        contradictions: synthesis.analysis.contradictions,
        confidenceLevel: synthesis.analysis.confidenceLevel,
        synthesisRationale: synthesis.analysis.synthesisRationale,
        modelBreakdown: synthesis.modelBreakdown,
      },
    });
  }

  private async resolveModel(): Promise<string> {
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    if (!thread) {
      return undefined;
    }
    return {
      systemPrompt: thread.systemPrompt,
      temperature: thread.temperature,
      maxTokens: thread.maxTokens,
    };
  }

  private parseConfidenceLevel(raw: unknown): ConsensusConfidenceLevel {
    if (
      raw === ConsensusConfidenceLevel.HIGH ||
      raw === ConsensusConfidenceLevel.MEDIUM ||
      raw === ConsensusConfidenceLevel.LOW
    ) {
      return raw;
    }
    return ConsensusConfidenceLevel.MEDIUM;
  }

  private clampScore(score: unknown): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 0.5;
    }
    return Math.min(1, Math.max(0, score));
  }

  private toStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((v): v is string => typeof v === 'string').slice(0, 3);
  }

  private buildTimedOutResponse(provider: string, model: string): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: this.timeoutMs,
      inputTokens: null,
      outputTokens: null,
      status: 'timeout',
      errorMessage: `Timed out after ${String(this.timeoutMs)}ms`,
    };
  }

  private buildFailedResponse(
    provider: string,
    model: string,
    errorMessage: string,
    latencyMs?: number,
  ): ParallelModelResponse {
    return {
      provider,
      model,
      content: '',
      latencyMs: latencyMs ?? 0,
      inputTokens: null,
      outputTokens: null,
      status: 'failed',
      errorMessage,
    };
  }
}
