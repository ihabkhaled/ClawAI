import { Injectable, Logger } from '@nestjs/common';
import { PaygSurface, TokenLedgerContext } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { ConsensusConfidenceLevel } from '../../../common/enums/consensus-confidence.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  CONSENSUS_MIN_CONTENT_LENGTH,
  CONSENSUS_SYNTHESIS_TIMEOUT_MS,
} from '../constants/consensus.constants';
import { PAYG_WORKFLOW_CONSENSUS } from '../constants/payg.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { AccessControlService } from '../services/access-control.service';
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
import type { ResearchTranscript } from '../types/research-transcript.types';
import { ChatExecutionManager } from './chat-execution.manager';
import { ChatContextGatewayManager } from './chat-context-gateway.manager';
import { resolveContextTurnText } from '../utilities/attachment-only-turn.utility';
import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MODE_HISTORY_MESSAGE_LIMIT } from '../constants/chat-context-gateway.constants';
import { ResearchEnricherManager } from './research-enricher.manager';
import { injectResearchEvidenceIntoContext } from '../utilities/research-prompt.utility';
import { userFacingErrorText } from '../utilities/provider-http-failure.utility';
import { PROVIDER_REQUEST_FAILED_MESSAGE } from '../constants/provider-credit.constants';

@Injectable()
export class ConsensusExecutionManager {
  private readonly logger = new Logger(ConsensusExecutionManager.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly chatContextGateway: ChatContextGatewayManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly accessControlService: AccessControlService,
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
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
  ): Promise<ConsensusResponse> {
    this.logger.log(
      `executeConsensus: queuing ${String(models.length)} models in thread ${threadId}`,
    );

    const userMessage = await this.storeUserMessage(threadId, content, fileIds);

    void this.executeInBackground(
      userId,
      threadId,
      userMessage.id,
      content,
      models,
      fileIds,
      researchMode,
      researchProviderId,
      userToken,
    );

    return { messageId: userMessage.id, threadId, prompt: content };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    consensusGroupId: string,
    content: string,
    models: ParallelModelTarget[],
    fileIds?: string[],
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
  ): Promise<void> {
    try {
      const { context: rawContext, threadSettings } = await this.buildContext(
        userId,
        threadId,
        fileIds,
      );
      // Enrich ONCE before fan-out — same dedupe pattern parallel uses.
      // Every lane and the synthesis row share the same transcript.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      const context = injectResearchEvidenceIntoContext(rawContext, enrichment.systemPrompt);
      this.safeEmitStage(threadId, {
        label: 'Dispatching candidates',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `${String(models.length)} models in parallel`,
        stageId: 'consensus:dispatch',
      });
      const responses = await this.executeAllModels(threadId, models, context, threadSettings);
      const completedResponses = responses.filter((r) => r.status === 'completed');
      this.safeEmitStage(threadId, {
        label: 'Dispatching candidates',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${String(completedResponses.length)}/${String(responses.length)} returned`,
        stageId: 'consensus:dispatch',
      });

      await this.storeModelMessages(threadId, consensusGroupId, responses, enrichment.transcript);

      this.safeEmitStage(threadId, {
        label: 'Judge dispatched',
        status: OrchestrationStageStatus.ACTIVE,
        detail: 'Synthesizing consensus from candidates',
        stageId: 'consensus:judge',
      });
      const synthesis = await this.synthesize(
        // Rule 42 §18: the synthesis reads no history, so an attachment-only
        // send's request has to be spelled out here or it synthesises "".
        resolveContextTurnText(content, context),
        completedResponses,
        models,
        userId,
        enrichment.systemPrompt.length > 0,
      );
      this.safeEmitStage(threadId, {
        label: 'Judge returned',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Agreement score ${String(synthesis.analysis.agreementScore.toFixed(2))}`,
        stageId: 'consensus:judge',
      });
      await this.storeSynthesisMessage(
        threadId,
        consensusGroupId,
        synthesis,
        enrichment.transcript,
      );

      this.logger.log(
        `executeInBackground: consensus done — ${String(completedResponses.length)}/${String(responses.length)} completed, score=${String(synthesis.analysis.agreementScore.toFixed(2))}`,
      );
      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'consensus:complete',
      });
      this.chatStreamService.emitCompletion(threadId, 'consensus', 'consensus');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: consensus failed — ${msg}`);
      this.safeEmitStage(threadId, {
        label: 'Consensus failed',
        status: OrchestrationStageStatus.ERROR,
        detail: msg,
        stageId: 'consensus:error',
      });
      await this.storeSynthesisMessage(
        threadId,
        consensusGroupId,
        this.buildFallbackSynthesis(msg),
        null,
      );
      this.chatStreamService.emitError(threadId, `Consensus execution failed: ${msg}`);
    }
  }

  /**
   * The same bundle a chat turn gets, from the one place that builds it.
   *
   * This method used to be eighteen lines, copied byte-for-byte into the
   * consensus and escalation managers beside it. Three copies meant any fix to
   * what a mode can see had to be made three times, and a fourth mode simply
   * did without.
   */
  private async buildContext(
    userId: string,
    threadId: string,
    fileIds?: string[],
  ): Promise<{ context: AssembledContext; threadSettings: ThreadSettings | undefined }> {
    const bundle = await this.chatContextGateway.build({
      userId,
      threadId,
      surface: ChatSurface.CONSENSUS,
      historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
      ...(fileIds !== undefined ? { fileIds } : {}),
    });
    return { context: bundle.context, threadSettings: bundle.threadSettings };
  }

  private async executeAllModels(
    threadId: string,
    models: ParallelModelTarget[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse[]> {
    const promises = models.map((target, index) =>
      this.executeWithTimeout(threadId, target, index + 1, models.length, context, threadSettings),
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
    threadId: string,
    target: ParallelModelTarget,
    candidateIndex: number,
    totalCandidates: number,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<ParallelModelResponse> {
    const stageId = `consensus:candidate:${String(candidateIndex)}`;
    this.safeEmitStage(threadId, {
      label: `Candidate ${String(candidateIndex)}/${String(totalCandidates)} dispatched`,
      status: OrchestrationStageStatus.ACTIVE,
      detail: `${target.provider}/${target.model}`,
      stageId,
    });
    const modelPromise = this.executeSingleModel(target, context, threadSettings).then((result) => {
      this.safeEmitStage(threadId, {
        label: `Candidate ${String(candidateIndex)}/${String(totalCandidates)} returned`,
        status:
          result.status === 'completed'
            ? OrchestrationStageStatus.COMPLETED
            : OrchestrationStageStatus.ERROR,
        detail: `${target.provider}/${target.model} — ${result.status}`,
        stageId,
      });
      return result;
    });
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Timeout after ${String(this.timeoutMs)}ms`)),
        this.timeoutMs,
      );
    });

    try {
      return await Promise.race([modelPromise, timeoutPromise]);
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && error.message.includes('Timeout after');
      if (isTimeout) {
        this.safeEmitStage(threadId, {
          label: `Candidate ${String(candidateIndex)}/${String(totalCandidates)} returned`,
          status: OrchestrationStageStatus.ERROR,
          detail: `${target.provider}/${target.model} — timeout`,
          stageId,
        });
        return this.buildTimedOutResponse(target.provider, target.model);
      }
      throw error;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private safeEmitStage(
    threadId: string,
    payload: {
      label: string;
      status: OrchestrationStageStatus;
      detail?: string;
      stageId?: string;
    },
  ): void {
    try {
      this.chatStreamService.emitOrchestrationStage(threadId, payload);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown emit error';
      this.logger.warn(`safeEmitStage: failed to emit "${payload.label}" — ${msg}`);
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
        undefined,
        undefined,
        TokenLedgerContext.CONSENSUS,
        { surface: PaygSurface.ORCHESTRATION, workflow: PAYG_WORKFLOW_CONSENSUS },
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
      // Stored as the lane's reply — never provider JSON or a URL (ADR-125).
      const errorMessage = userFacingErrorText(error, PROVIDER_REQUEST_FAILED_MESSAGE);
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
    userId: string,
    hasResearchEvidence: boolean,
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
      return await this.runOllamaSynthesis(
        prompt,
        completedResponses,
        allModels,
        userId,
        hasResearchEvidence,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Synthesis failed';
      this.logger.warn(`synthesize: Ollama synthesis failed, using heuristic — ${msg}`);
      return this.buildHeuristicSynthesis(completedResponses, allModels, hasResearchEvidence);
    }
  }

  private async runOllamaSynthesis(
    prompt: string,
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
    userId: string,
    hasResearchEvidence: boolean,
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
      hasResearchEvidence,
    );
    const synthesisModel = await this.resolveModel();
    const requestBody: OllamaGenerateRequest = {
      model: synthesisModel,
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

    // Universal token deduction: synthesis hop is a real LLM call (the
    // per-lane calls already record via ChatExecutionManager.callProvider).
    void this.accessControlService.recordUsage({
      userId,
      planId: null,
      inputTokens: response.data.promptEvalCount ?? 0,
      outputTokens: response.data.evalCount ?? 0,
      provider: 'local-ollama',
      model: synthesisModel,
    });

    const parsed = this.parseSynthesisJson(response.data.response);
    return this.buildSynthesisResult(parsed, completedResponses, allModels, hasResearchEvidence);
  }

  private buildSynthesisPrompt(
    originalPrompt: string,
    responseList: string,
    count: number,
    hasResearchEvidence: boolean,
  ): string {
    // Bounded fix for the 2026-09-23 fabrication report: this synthesizer used
    // to treat every lane as equally trustworthy, so a confident, zero-citation
    // fabrication from one lane and an honest "no evidence found" from another
    // were weighed the same — and the longer, more detailed-sounding
    // fabrication won by construction (`buildSynthesisResult`'s own fallback
    // picks the longest response). This is deliberately NOT a general
    // disagreement-detection system — it is one instruction, added only when
    // this run actually had web evidence to ground on, telling the synthesizer
    // what a human reviewer would already do: trust the lane that cites the
    // evidence over the one that does not, and say so.
    const groundingRule = hasResearchEvidence
      ? '\n\nThis run included live web research evidence. Some responses may cite it with [n] markers; others may lack citations, claim they found nothing, or invent details. Do NOT treat an uncited, confident-sounding answer as more trustworthy than one that honestly reports missing or unclear evidence. If responses disagree about a web fact, prefer the ones that cite [n] evidence, note the disagreement in "disagreements", and only include a specific number/date/URL in finalAnswer if at least one response actually cited it.'
      : '';
    return `You are a consensus analyzer. Analyze ${String(count)} AI responses to a prompt and create a merged synthesis.

ORIGINAL PROMPT: ${originalPrompt.slice(0, 500)}

MODEL RESPONSES:
${responseList}${groundingRule}

Return ONLY valid JSON, no markdown, no explanation:
{"finalAnswer":"merged answer","agreementScore":0.8,"agreements":["point1","point2"],"disagreements":["diff1"],"contradictions":[],"confidenceLevel":"HIGH","synthesisRationale":"brief reason"}

Rules: agreementScore 0.0-1.0, confidenceLevel must be HIGH/MEDIUM/LOW, max 3 items per array.`;
  }

  private parseSynthesisJson(raw: string): Record<string, unknown> {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      return !jsonMatch ? {} : (JSON.parse(jsonMatch[0]) as Record<string, unknown>);
    } catch {
      return {};
    }
  }

  private buildSynthesisResult(
    parsed: Record<string, unknown>,
    completedResponses: ParallelModelResponse[],
    allModels: ParallelModelTarget[],
    hasResearchEvidence: boolean,
  ): ConsensusSynthesisResult {
    const bestResponse = this.selectBestResponse(completedResponses, hasResearchEvidence);

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
    hasResearchEvidence: boolean,
  ): ConsensusSynthesisResult {
    const bestResponse = this.selectBestResponse(completedResponses, hasResearchEvidence);
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

  /**
   * The fallback "best" lane — used both as the finalAnswer when the LLM
   * synthesizer's JSON is unusable/too short, and as the whole answer on the
   * heuristic (synthesizer-unreachable) path.
   *
   * Length alone rewards confident invention: a fabricated three-tier pricing
   * table is always longer than an honest "no verified prices found", so the
   * old `cur.content.length > best.content.length` reducer picked the
   * fabrication every time research evidence existed. When this run actually
   * had web evidence, a lane that cites it with [n] markers is preferred over
   * one that does not, before length is even considered; only content with NO
   * citations from ANY lane (or a run with no evidence at all) falls back to
   * length, which is the pre-existing behaviour for ordinary, non-web prompts.
   */
  private selectBestResponse(
    completedResponses: ParallelModelResponse[],
    hasResearchEvidence: boolean,
  ): ParallelModelResponse {
    if (hasResearchEvidence) {
      const cited = completedResponses.filter((r) => this.countCitationMarkers(r.content) > 0);
      if (cited.length > 0) {
        return cited.reduce((best, cur) =>
          this.countCitationMarkers(cur.content) > this.countCitationMarkers(best.content)
            ? cur
            : best,
        );
      }
    }
    return completedResponses.reduce((best, cur) =>
      cur.content.length > best.content.length ? cur : best,
    );
  }

  private countCitationMarkers(content: string): number {
    return (content.match(/\[\d+\]/g) ?? []).length;
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
    researchTranscript: ResearchTranscript | null,
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
        metadata: {
          consensusExecution: true,
          consensusGroupId,
          status: r.status,
          ...(researchTranscript === null ? {} : { researchTranscript }),
        },
      }),
    );
    await Promise.all(storePromises);
  }

  private async storeSynthesisMessage(
    threadId: string,
    consensusGroupId: string,
    synthesis: ConsensusSynthesisResult,
    researchTranscript: ResearchTranscript | null,
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
        ...(researchTranscript === null ? {} : { researchTranscript }),
      },
    });
  }

  private async resolveModel(): Promise<string> {
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private parseConfidenceLevel(raw: unknown): ConsensusConfidenceLevel {
    return raw === ConsensusConfidenceLevel.HIGH ||
      raw === ConsensusConfidenceLevel.MEDIUM ||
      raw === ConsensusConfidenceLevel.LOW
      ? raw
      : ConsensusConfidenceLevel.MEDIUM;
  }

  private clampScore(score: unknown): number {
    return typeof score !== 'number' || Number.isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score));
  }

  private toStringArray(raw: unknown): string[] {
    return !Array.isArray(raw)
      ? []
      : raw.filter((v): v is string => typeof v === 'string').slice(0, 3);
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
