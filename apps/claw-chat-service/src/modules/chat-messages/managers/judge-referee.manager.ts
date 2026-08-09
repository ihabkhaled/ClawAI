import { Injectable, Logger } from '@nestjs/common';
import { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';

import { OLLAMA_PROVIDER } from '../../../common/constants';
import { AiStreamStage, JudgeDecision } from '../../../common/enums';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import {
  buildAttachedFilesManifest,
  buildCriticSystemPrompt,
  buildCriticUserPrompt,
  buildFileDeliveryEntries,
  buildLaneDeliverySummary,
  parseJudgeModel,
} from '../../../common/utilities';
import {
  CRITIC_CLOUD_MODELS,
  CRITIC_LOCAL_MODEL,
  CRITIC_PARSE_FAILURE_SUMMARY,
  JUDGE_CONFIDENCE_THRESHOLD,
  JUDGE_FILE_GROUNDING_CLAUSE,
  JUDGE_LOCAL_MODEL,
  JUDGE_REFEREE_AUTO_CATEGORIES,
  JUDGE_SYSTEM_PROMPT,
} from '../constants/judge-referee.constants';
import { AccessControlService } from '../services/access-control.service';
import { FileDeliveryRecordService } from '../services/file-delivery-record.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse, MessageRoutedData, ThreadSettings } from '../types/execution.types';
import type { FileDeliveryRecordView } from '../types/file-delivery-record.types';
import type { FileDeliveryEntry } from '../types/file-delivery.types';
import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
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
    // Optional so legacy tests that construct the manager with two args keep
    // compiling; supplied by the Nest DI container in production where the
    // plan-feature defense-in-depth gate must fire before any critic LLM call.
    private readonly accessControlService?: AccessControlService,
    // Slice D — optional source-of-truth for per-(message, file, model)
    // delivery mode. When supplied, judge/critic prompts prefer the durable
    // file_delivery_records table over the inline metadata.fileDelivery JSON
    // path. Optional so legacy tests that construct the manager without it
    // keep compiling and fall back to the context.fileContents heuristic.
    private readonly fileDeliveryRecordService?: FileDeliveryRecordService,
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

    // Resolve a critic ONLY when one was actually requested. Resolving
    // unconditionally meant a disabled critic still auto-picked a cloud model
    // from CRITIC_CLOUD_MODELS and reported it, so the judge panel displayed
    // "ANTHROPIC/claude-sonnet-4" as the critic for a critic that never ran.
    const criticEnabled = config.criticEnabled === true;
    const criticModelInfo = criticEnabled
      ? await this.resolveCriticTarget(response.provider, config)
      : null;
    const criticModelLabel =
      criticModelInfo === null ? null : `${criticModelInfo.provider}/${criticModelInfo.model}`;
    const overrideJudgeModel = threadSettings?.judgeModel ?? null;
    // Feature 1 — a user-chosen cloud connector model now runs through the
    // normal provider path. AUTO / unset keeps the local-first default.
    const judgeTarget = await this.resolveJudgeTarget(overrideJudgeModel ?? JUDGE_LOCAL_MODEL);
    const judgeModelLabel = `${judgeTarget.provider}/${judgeTarget.model}`;
    this.chatStreamService.emitJudgeEvaluating(payload.threadId, criticModelLabel, judgeModelLabel);

    // Slice D — prefer file_delivery_records (durable, per-(message,file,model)
    // truth) over the inline metadata.fileDelivery JSON path. Falls back to
    // context.fileContents when the table is empty (legacy / pre-Slice-D
    // messages) or the service is unavailable (tests).
    const deliveryRecords = await this.loadDeliveryRecords(payload.messageId, context.userId);

    // Execution order is generator -> critic -> judge: the critic's score and
    // feedback are an input to callJudge below, so the judge always rules on a
    // draft the critic has already been given a chance to improve. Each step
    // gets its own active/completed pair on the orchestration timeline so the
    // UI shows which of the two is running, not one merged "verifying" blob —
    // and nothing is emitted for the critic step when it is disabled.
    let criticEvaluation: CriticEvaluation;
    if (criticModelInfo !== null) {
      const resolvedCriticLabel = `${criticModelInfo.provider}/${criticModelInfo.model}`;
      this.emitReviewStage(
        payload.threadId,
        AiStreamStage.CRITIQUING,
        resolvedCriticLabel,
        OrchestrationStageStatus.ACTIVE,
      );
      criticEvaluation = await this.callCriticWithModel(
        response,
        context,
        config,
        criticModelInfo,
        deliveryRecords,
      );
      this.emitReviewStage(
        payload.threadId,
        AiStreamStage.CRITIQUING,
        resolvedCriticLabel,
        OrchestrationStageStatus.COMPLETED,
      );
    } else {
      criticEvaluation = this.buildSkippedCriticEvaluation(config);
    }

    this.emitReviewStage(
      payload.threadId,
      AiStreamStage.JUDGING,
      judgeModelLabel,
      OrchestrationStageStatus.ACTIVE,
    );
    const judgeVerdict = await this.callJudge(
      response,
      criticEvaluation,
      context,
      config,
      judgeTarget,
      deliveryRecords,
    );
    this.emitReviewStage(
      payload.threadId,
      AiStreamStage.JUDGING,
      judgeModelLabel,
      OrchestrationStageStatus.COMPLETED,
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
      criticSummary: result.criticEvaluation.summary,
      criticRequested: result.criticEvaluation.requested,
      criticParseFailed: result.criticEvaluation.parseFailed === true,
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
    deliveryRecords?: FileDeliveryRecordView[],
  ): Promise<CriticEvaluation> {
    const startTime = Date.now();
    const criticPrompt = buildCriticSystemPrompt(config.category);

    this.logger.debug(
      `callCritic: using ${criticModel.provider}/${criticModel.model} for category=${config.category ?? 'generic'}`,
    );

    const userPrompt = this.extractUserPrompt(context);
    const attachments = this.buildAttachmentsBlock(
      context,
      response.provider,
      response.model,
      deliveryRecords,
    );
    const criticContext: AssembledContext = {
      ...context,
      systemPrompt: criticPrompt,
      threadMessages: [
        {
          role: 'USER',
          content: buildCriticUserPrompt(userPrompt, response.content, attachments),
        } as AssembledContext['threadMessages'][0],
      ],
    };

    try {
      if (!this.executionManager) {
        throw new Error('ExecutionManager not set');
      }
      // Defense-in-depth — re-assert the plan-feature gate right before the
      // critic LLM is invoked. The service-boundary check
      // (assertCompareAccess) already ran for the user-facing request; this
      // catches any future code path that bypasses the boundary. Skipped if
      // no userId was supplied (legacy tests / callers).
      if (config.userId !== undefined && this.accessControlService) {
        await this.accessControlService.assertCanUseCritic(config.userId);
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
        summary: parsed.summary,
        requested: true,
        parseFailed: parsed.parseFailed,
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
      this.logger.warn(`callCritic: failed — ${msg}. Persisting parse-failure marker.`);
      return {
        feedback: [],
        score: 1.0,
        summary: CRITIC_PARSE_FAILURE_SUMMARY,
        requested: true,
        parseFailed: true,
        category: config.category ?? 'generic',
        model: `${criticModel.provider}/${criticModel.model}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // Used when the user did not opt into the critic for this run. We still
  // record a CriticEvaluation row so the JudgeReview payload has a stable
  // shape and the UI can render "Critic was not requested." instead of
  // pretending the critic produced an empty review.
  // No critic ran, so no critic model is reported. Naming a model here made the
  // UI attribute a review to a model that was never called.
  private buildSkippedCriticEvaluation(config: JudgeRefereeConfig): CriticEvaluation {
    return {
      feedback: [],
      score: 1.0,
      summary: '',
      requested: false,
      parseFailed: false,
      category: config.category ?? 'generic',
      model: '',
      latencyMs: 0,
    };
  }

  // Puts the critic and judge steps on the orchestration timeline as their own
  // active -> completed entries (reusing the same channel every other manager
  // in this module uses for step-by-step visibility), so the UI can show
  // "Critiquing" and "Judging" as distinct, sequential steps instead of one
  // merged "Verifying answer" span with no indication of which model is
  // running or how long each half took.
  private emitReviewStage(
    threadId: string,
    stage: typeof AiStreamStage.CRITIQUING | typeof AiStreamStage.JUDGING,
    modelLabel: string,
    status: OrchestrationStageStatus,
  ): void {
    const isCritic = stage === AiStreamStage.CRITIQUING;
    this.chatStreamService.emitOrchestrationStage(threadId, {
      label: isCritic ? 'Critiquing the draft' : 'Judging the response',
      status,
      detail: modelLabel,
      stageId: `${stage}:${modelLabel}`,
    });
  }

  private async callJudge(
    response: LlmResponse,
    criticEval: CriticEvaluation,
    context: AssembledContext,
    _config: JudgeRefereeConfig,
    judgeTarget: { provider: string; model: string },
    deliveryRecords?: FileDeliveryRecordView[],
  ): Promise<JudgeVerdict> {
    const startTime = Date.now();
    const judgeLabel = `${judgeTarget.provider}/${judgeTarget.model}`;

    this.logger.debug(`callJudge: using ${judgeLabel}`);

    const judgeContext = this.buildJudgeContext(response, criticEval, context, deliveryRecords);

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
    deliveryRecords?: FileDeliveryRecordView[],
  ): AssembledContext {
    const userPrompt = this.extractUserPrompt(context);
    const attachments = this.buildAttachmentsBlock(
      context,
      response.provider,
      response.model,
      deliveryRecords,
    );
    const sections: string[] = [];
    if (attachments !== undefined) {
      if (attachments.manifestBlock.length > 0) {
        sections.push(attachments.manifestBlock);
      }
      if (attachments.perLaneDelivery.length > 0) {
        sections.push(`Delivery summary:\n${attachments.perLaneDelivery}`);
      }
    }
    sections.push(`User question: ${userPrompt}`);
    sections.push(`\nAI response:\n${response.content}`);
    sections.push(`\nCritic evaluation:`);
    sections.push(`Score: ${String(criticEval.score)}`);
    sections.push(
      `Feedback: ${criticEval.feedback.length > 0 ? criticEval.feedback.join('; ') : 'No issues found'}`,
    );

    // Records (durable) win over context.fileContents (legacy) when present.
    const hasFiles =
      (deliveryRecords !== undefined && deliveryRecords.length > 0) ||
      (context.fileContents ?? []).length > 0;
    const systemPrompt = hasFiles
      ? `${JUDGE_SYSTEM_PROMPT}${JUDGE_FILE_GROUNDING_CLAUSE}`
      : JUDGE_SYSTEM_PROMPT;

    return {
      ...context,
      systemPrompt,
      threadMessages: [
        { role: 'USER', content: sections.join('\n') } as AssembledContext['threadMessages'][0],
      ],
    };
  }

  // Builds the attachments block consumed by the judge + critic prompts.
  // Returns undefined when there are no files (so callers can short-circuit
  // back to the legacy prompt shape).
  //
  // Slice D — when `deliveryRecords` is supplied AND non-empty, the per-lane
  // delivery summary is built from the durable file_delivery_records table
  // (source of truth) instead of re-classifying context.fileContents via the
  // provider-vision heuristic. The manifest block still uses
  // context.fileContents because the records table does not store snippet
  // content. When records are absent we fall back to the legacy heuristic
  // path so pre-Slice-D messages keep their existing prompt shape.
  private buildAttachmentsBlock(
    context: AssembledContext,
    provider: string,
    model: string,
    deliveryRecords?: FileDeliveryRecordView[],
  ): { manifestBlock: string; perLaneDelivery: string } | undefined {
    const files = context.fileContents ?? [];
    const records = deliveryRecords ?? [];
    if (files.length === 0 && records.length === 0) {
      return undefined;
    }
    const entries =
      records.length > 0
        ? this.deliveryEntriesFromRecords(records, provider, model)
        : buildFileDeliveryEntries(files, provider, model);
    return {
      manifestBlock: buildAttachedFilesManifest(files),
      perLaneDelivery: buildLaneDeliverySummary(entries),
    };
  }

  // Slice D — converts persisted FileDeliveryRecord rows for THIS lane
  // (provider+model) into the FileDeliveryEntry shape expected by
  // buildLaneDeliverySummary. Rows for other lanes are filtered out so the
  // lane summary only counts what this specific (provider, model) actually
  // received at execution time.
  private deliveryEntriesFromRecords(
    records: FileDeliveryRecordView[],
    provider: string,
    model: string,
  ): FileDeliveryEntry[] {
    return records
      .filter((row) => row.provider === provider && row.model === model)
      .map((row) => ({
        fileId: row.fileId,
        filename: row.filename,
        mimeType: row.mimeType,
        provider: row.provider,
        model: row.model,
        mode: row.mode as FileDeliveryMode,
      }));
  }

  // Slice D — attempts to load the durable file_delivery_records rows for
  // the original message. Returns undefined (NOT empty) when the lookup
  // fails or the service is not wired so callers can cleanly distinguish
  // "records source-of-truth applies" from "fall back to context.fileContents".
  private async loadDeliveryRecords(
    messageId: string,
    userId: string,
  ): Promise<FileDeliveryRecordView[] | undefined> {
    if (!this.fileDeliveryRecordService) {
      return undefined;
    }
    try {
      const rows = await this.fileDeliveryRecordService.getDeliveriesForMessage(messageId, userId);
      this.logger.debug(
        `loadDeliveryRecords: messageId=${messageId} returned ${String(rows.length)} rows`,
      );
      return rows;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `loadDeliveryRecords: failed for messageId=${messageId} — ${msg}. Falling back to context.fileContents.`,
      );
      return undefined;
    }
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
      criticSummary: result.criticEvaluation.summary,
      criticRequested: result.criticEvaluation.requested,
      criticParseFailed: result.criticEvaluation.parseFailed === true,
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

  // Resolves the critic execution target. When the user explicitly selected a
  // critic model in the compare DTO, that selection wins — parsed the same way
  // judge models are (PROVIDER:model or plain local model name). Otherwise we
  // fall back to the legacy auto-pick: local in local-only mode, else the first
  // cloud critic from CRITIC_CLOUD_MODELS that doesn't match the generator's
  // provider. This is the single fix for the "Critic model is hardcoded to
  // ANTHROPIC/claude-sonnet-4" bug.
  async resolveCriticTarget(
    generatorProvider: string,
    config: JudgeRefereeConfig,
  ): Promise<{ provider: string; model: string }> {
    const userSelected = config.criticEnabled === true ? (config.criticModel ?? '').trim() : '';
    if (userSelected.length > 0) {
      const parsed: ParsedJudgeModel = parseJudgeModel(userSelected);
      if (parsed.provider !== null) {
        const isOllamaLocal = parsed.provider === OLLAMA_PROVIDER;
        return {
          provider: parsed.provider,
          model: isOllamaLocal ? await this.resolveModel(parsed.model) : parsed.model,
        };
      }
      const localModel = parsed.model.length > 0 ? parsed.model : CRITIC_LOCAL_MODEL;
      return { provider: OLLAMA_PROVIDER, model: await this.resolveModel(localModel) };
    }
    return this.selectCriticModel(generatorProvider, config.isLocalOnly);
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
  private buildJudgeTokenUsage(critic: CriticEvaluation, judge: JudgeVerdict): JudgeTokenUsage {
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
      : (allEstimated
        ? TokenUsageSource.ESTIMATED
        : TokenUsageSource.MIXED);
    return {
      inputTokens: (critic.inputTokens ?? 0) + (judge.inputTokens ?? 0),
      outputTokens: (critic.outputTokens ?? 0) + (judge.outputTokens ?? 0),
      estimated: criticEstimated || judgeEstimated,
      source,
    };
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

  private parseCriticOutput(content: string): {
    feedback: string[];
    score: number;
    summary: string;
    parseFailed: boolean;
  } {
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
        ? (parsed['feedback'] as unknown[]).filter(
            (f): f is string => typeof f === 'string' && f.trim().length > 0,
          )
        : [];
      const score =
        typeof parsed['score'] === 'number' ? Math.max(0, Math.min(1, parsed['score'])) : 0.5;
      const summary =
        typeof parsed['summary'] === 'string' && parsed['summary'].trim().length > 0
          ? parsed['summary'].trim()
          : this.deriveSummaryFallback(feedback);

      return { feedback, score, summary, parseFailed: false };
    } catch {
      this.logger.warn(
        'parseCriticOutput: failed to parse critic output. Persisting parse-failure marker.',
      );
      return {
        feedback: [],
        score: 1.0,
        summary: CRITIC_PARSE_FAILURE_SUMMARY,
        parseFailed: true,
      };
    }
  }

  private deriveSummaryFallback(feedback: string[]): string {
    if (feedback.length === 0) {
      return 'No critical issues detected.';
    }
    return `Critic raised ${String(feedback.length)} note(s); see details for the full list.`;
  }

  private extractUserPrompt(context: AssembledContext): string {
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    return lastUserMsg?.content ?? '';
  }
}
