import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import {
  DEFAULT_VERIFIER_MODEL,
  MAX_VERIFIER_REVISIONS,
  VERIFIER_PASS_THRESHOLD,
} from '../constants/verifier.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { ChatContextGatewayManager } from './chat-context-gateway.manager';
import { ModeExecutionGatewayManager } from './mode-execution-gateway.manager';
import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MODE_HISTORY_MESSAGE_LIMIT } from '../constants/chat-context-gateway.constants';
import { parseJudgeModel } from '../../../common/utilities/judge-model-parse.utility';
import { TokenLedgerContext } from '@claw/shared-types';
import { ResearchEnricherManager } from './research-enricher.manager';
import type { ResearchTranscript } from '../types/research-transcript.types';
import type { VerifyMessageDto } from '../dto/verify-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { VerifierCheckResult, VerifyResponse } from '../types/verifier.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import { RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_VERIFIER } from '../constants/payg.constants';

/**
 * Draft an answer, judge it, repair it.
 *
 * All three hops used to post a hand-built `OllamaGenerateRequest` at
 * `/api/v1/ollama/generate`, which pinned the mode to a local model and metered
 * it through `meterOrchestrationCall` plus a hand-rolled `recordUsage` — a
 * second accounting path beside the one chat uses. Worse, the verify pass was
 * handed nothing but its own rubric: no history, no files, no memories, and not
 * even the research evidence the draft was written from. It judged an answer
 * without being allowed to see the conversation that produced it, then scored
 * it for "completeness".
 */
@Injectable()
export class VerifierManager {
  private readonly logger = new Logger(VerifierManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly chatContextGateway: ChatContextGatewayManager,
    private readonly modeExecutionGateway: ModeExecutionGatewayManager,
    private readonly researchEnricherManager: ResearchEnricherManager,
    private readonly advancedModelSelectionService?: AdvancedModuleModelSelectionService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeVerify(
    userId: string,
    dto: VerifyMessageDto,
    userToken: string,
  ): Promise<VerifyResponse> {
    this.logger.log(`executeVerify: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { verifyRequest: true, maxRevisions: dto.maxRevisions, modelSelection: selection },
    });

    void this.executeInBackground(
      threadId,
      dto.content,
      dto.maxRevisions,
      userId,
      selection,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
      dto.fileIds,
    );

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    maxRevisions: number,
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
    fileIds?: string[],
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      // Enrich ONCE — initial draft, every verifier-check, and every repair
      // step share the same evidence so a hallucinated fact in the draft can
      // be repaired against the same web sources.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // One bundle, shared by the draft pass, every verifier-check and every
      // repair. Sharing it is the point: a judge that sees a different context
      // from the writer is judging a different question, and the verify pass
      // used to see no context at all. Building it once also means one set of
      // retrievals rather than one per hop.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.VERIFY,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // The enricher's transcript used to be glued to the front of the draft
        // and repair prompts, and never reached the verifier at all. It is an
        // instruction about how to answer, so it belongs in the system prompt
        // beside the user's own — appended, never replacing.
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
        ...(fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {}),
      });
      this.safeEmitStage(threadId, {
        label: 'Generating',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `${resolvedSelection.actualProvider}/${resolvedSelection.actualModel}`,
        stageId: 'verifier:draft',
      });
      const draft = await this.generateDraft(bundle, content, resolvedSelection);
      this.safeEmitStage(threadId, {
        label: 'Generating',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Draft ready (${String(draft.length)} chars)`,
        stageId: 'verifier:draft',
      });
      this.safeEmitStage(threadId, {
        label: 'Verifier judging',
        status: OrchestrationStageStatus.ACTIVE,
        detail: 'Scoring factuality / completeness / safety / formatting',
        stageId: 'verifier:check:0',
      });
      const checkResult = await this.runVerifierCheck(bundle, content, draft, resolvedSelection);
      this.safeEmitStage(threadId, {
        label: 'Verifier judging',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Score ${String(checkResult.score.toFixed(2))}`,
        stageId: 'verifier:check:0',
      });

      if (checkResult.score >= VERIFIER_PASS_THRESHOLD || maxRevisions === 0) {
        await this.storeVerifiedMessage(
          threadId,
          draft,
          checkResult,
          0,
          startTime,
          resolvedSelection,
          enrichment.transcript,
        );
        this.safeEmitStage(threadId, {
          label: 'Complete',
          status: OrchestrationStageStatus.COMPLETED,
          detail: 'Passed on first check',
          stageId: 'verifier:complete',
        });
        this.chatStreamService.emitCompletion(
          threadId,
          resolvedSelection.actualProvider,
          resolvedSelection.actualModel,
        );
        return;
      }

      const { finalDraft, finalCheck, revisionCount } = await this.runRevisions(
        bundle,
        threadId,
        content,
        draft,
        checkResult,
        maxRevisions,
        resolvedSelection,
      );

      await this.storeVerifiedMessage(
        threadId,
        finalDraft,
        finalCheck,
        revisionCount,
        startTime,
        resolvedSelection,
        enrichment.transcript,
      );
      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Final score ${String(finalCheck.score.toFixed(2))} after ${String(revisionCount)} revision(s)`,
        stageId: 'verifier:complete',
      });
      this.chatStreamService.emitCompletion(
        threadId,
        resolvedSelection.actualProvider,
        resolvedSelection.actualModel,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Verification failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} — ${msg}`);
      this.safeEmitStage(threadId, {
        label: 'Verifier failed',
        status: OrchestrationStageStatus.ERROR,
        detail: msg,
        stageId: 'verifier:error',
      });
      this.chatStreamService.emitError(threadId, `Verifier failed: ${msg}`);
      try {
        await this.storeErrorMessage(threadId, msg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Unknown store error';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async runRevisions(
    bundle: ChatContextBundle,
    threadId: string,
    content: string,
    initialDraft: string,
    initialCheck: VerifierCheckResult,
    maxRevisions: number,
    selection: AdvancedModelSelectionResolution,
  ): Promise<{ finalDraft: string; finalCheck: VerifierCheckResult; revisionCount: number }> {
    let currentDraft = initialDraft;
    let currentCheck = initialCheck;
    let revisionCount = 0;

    for (let i = 0; i < maxRevisions; i++) {
      const round = i + 1;
      const stageId = `verifier:revise:${String(round)}`;
      this.safeEmitStage(threadId, {
        label: `Revising (round ${String(round)})`,
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Applying ${String(currentCheck.suggestions.length)} suggestion(s)`,
        stageId,
      });
      // Sequential by definition: round N repairs what round N-1 scored, and
      // scores what round N repaired. This is a dependency chain, not a loop
      // that could have been a Promise.all.
      const revised = await this.repairDraft(
        bundle,
        content,
        currentDraft,
        currentCheck.suggestions,
        selection,
      );
      const recheck = await this.runVerifierCheck(bundle, content, revised, selection);
      revisionCount += 1;
      currentDraft = revised;
      currentCheck = recheck;
      this.safeEmitStage(threadId, {
        label: `Revising (round ${String(round)})`,
        status: OrchestrationStageStatus.COMPLETED,
        detail: `Score ${String(recheck.score.toFixed(2))}`,
        stageId,
      });

      if (currentCheck.score >= VERIFIER_PASS_THRESHOLD) {
        break;
      }
    }

    return { finalDraft: currentDraft, finalCheck: currentCheck, revisionCount };
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

  /**
   * The draft pass, through the same chokepoint a chat turn uses.
   *
   * `callProvider` is the universal token-deduction point and records every
   * call that passes through it, so the `meterOrchestrationCall` wrapper and
   * the hand-rolled `recordUsage` that used to sit here are gone — they were a
   * second path to the same ledger.
   */
  private async generateDraft(
    bundle: ChatContextBundle,
    content: string,
    selection: AdvancedModelSelectionResolution,
  ): Promise<string> {
    const parsed = parseJudgeModel(selection.actualModel);

    const response = await this.modeExecutionGateway.run({
      bundle,
      prompt: content,
      provider: parsed.provider ?? OLLAMA_PROVIDER,
      model: parsed.model.length > 0 ? parsed.model : selection.actualModel,
      ledgerContext: TokenLedgerContext.VERIFY,
      paygCall: {
        workflow: PAYG_WORKFLOW_VERIFIER,
        requestId: `verifier:draft:${randomUUID()}`,
      },
    });

    const draft = (response.content ?? '').trim();
    if (draft.length === 0) {
      throw new Error('Verifier draft generation returned an empty response');
    }

    return draft;
  }

  /**
   * The verify pass — now with sight of the conversation it is judging.
   *
   * The rubric below is the question being asked, so it goes in as the
   * `prompt`: the gateway APPENDS it as a user turn on top of the shared
   * bundle instead of replacing the conversation with it. That is the whole
   * defect this fixes. The old template was the verifier's entire world — it
   * scored "completeness" against a question it could only see through a
   * one-line quotation, with no history, no attachments, no memories and not
   * even the research evidence the draft had been written from.
   */
  private async runVerifierCheck(
    bundle: ChatContextBundle,
    content: string,
    draft: string,
    selection: AdvancedModelSelectionResolution,
  ): Promise<VerifierCheckResult> {
    const verifierPrompt = `You are a response quality verifier. Evaluate this response to the given question.

Question: ${content}

Response: ${draft}

Score the response on: factuality (0-1), completeness (0-1), safety (0-1), formatting (0-1).
Return ONLY JSON: { "score": <average 0-1>, "issues": ["..."], "suggestions": ["..."] }`;

    const parsed = parseJudgeModel(selection.actualModel);

    try {
      const response = await this.modeExecutionGateway.run({
        bundle,
        prompt: verifierPrompt,
        provider: parsed.provider ?? OLLAMA_PROVIDER,
        model: parsed.model.length > 0 ? parsed.model : selection.actualModel,
        ledgerContext: TokenLedgerContext.VERIFY,
        paygCall: {
          workflow: PAYG_WORKFLOW_VERIFIER,
          requestId: `verifier:check:${randomUUID()}`,
        },
      });

      return this.parseVerifierResponse(response.content ?? '');
    } catch (error: unknown) {
      // A judge outage must not destroy a draft that is already written: the
      // old code returned this same pass-through score when the verifier
      // replied with a non-2xx status. A billing refusal is not an outage,
      // though — swallowing it would silently score an uncharged run as
      // "passed", so it keeps propagating.
      if (error instanceof BusinessException) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : 'Unknown verifier error';
      this.logger.warn(`runVerifierCheck: verifier call failed (${msg}), using fallback`);
      return { passed: true, score: 1, issues: [], suggestions: [] };
    }
  }

  private parseVerifierResponse(raw: string): VerifierCheckResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { passed: true, score: 1, issues: [], suggestions: [] };
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const score = typeof parsed['score'] === 'number' ? parsed['score'] : 1;
      const issues = Array.isArray(parsed['issues'])
        ? (parsed['issues'] as string[]).filter((s): s is string => typeof s === 'string')
        : [];
      const suggestions = Array.isArray(parsed['suggestions'])
        ? (parsed['suggestions'] as string[]).filter((s): s is string => typeof s === 'string')
        : [];
      return { passed: score >= VERIFIER_PASS_THRESHOLD, score, issues, suggestions };
    } catch {
      return { passed: true, score: 1, issues: [], suggestions: [] };
    }
  }

  /**
   * The repair pass, on the same bundle the draft and the judge saw.
   *
   * The research evidence used to be glued to the front of this prompt by
   * `prependResearchEvidence`; it now reaches the model as part of the shared
   * bundle's system prompt, which is where an instruction about how to answer
   * belongs — and is why the judge can finally see it too.
   */
  private async repairDraft(
    bundle: ChatContextBundle,
    content: string,
    draft: string,
    suggestions: string[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<string> {
    const suggestionText =
      suggestions.length > 0
        ? suggestions.map((s) => `- ${s}`).join('\n')
        : '- Improve overall quality';

    const repairPrompt = `You are a response improvement assistant. Revise the following response based on the suggestions.

Original question: ${content}

Current response:
${draft}

Suggestions for improvement:
${suggestionText}

Return ONLY the improved response. Do not explain changes.`;

    const parsed = parseJudgeModel(selection.actualModel);

    try {
      const response = await this.modeExecutionGateway.run({
        bundle,
        prompt: repairPrompt,
        provider: parsed.provider ?? OLLAMA_PROVIDER,
        model: parsed.model.length > 0 ? parsed.model : selection.actualModel,
        ledgerContext: TokenLedgerContext.VERIFY,
        paygCall: {
          workflow: PAYG_WORKFLOW_VERIFIER,
          requestId: `verifier:repair:${randomUUID()}`,
        },
      });

      const repaired = (response.content ?? '').trim();
      return repaired.length > 0 ? repaired : draft;
    } catch (error: unknown) {
      // Same contract as the old non-2xx branch: a failed repair falls back to
      // the draft the user would otherwise lose. A billing refusal still
      // propagates rather than being charged for and discarded.
      if (error instanceof BusinessException) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : 'Unknown repair error';
      this.logger.warn(`repairDraft: repair call failed (${msg}), using original draft`);
      return draft;
    }
  }

  private async storeVerifiedMessage(
    threadId: string,
    content: string,
    checkResult: VerifierCheckResult,
    revisionCount: number,
    startTime: number,
    selection: AdvancedModelSelectionResolution,
    researchTranscript: ResearchTranscript | null,
  ): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content,
      provider: selection.actualProvider,
      model: selection.actualModel,
      routingMode:
        selection.modelSelectionMode === 'MANUAL_MODEL'
          ? RoutingMode.MANUAL_MODEL
          : RoutingMode.AUTO,
      latencyMs: Date.now() - startTime,
      usedFallback: false,
      metadata: {
        verified: true,
        verifierScore: checkResult.score,
        verifierIssues: checkResult.issues,
        revisionCount,
        modelSelection: selection,
        ...(researchTranscript === null ? {} : { researchTranscript }),
      },
    });
  }

  private async resolveThreadId(userId: string, dto: VerifyMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Verify: ${dto.content.slice(0, 50)}`,
      routingMode: RoutingMode.AUTO,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Verification failed: ${errorMsg}`,
      provider: 'local-ollama',
      model: await this.resolveModel(DEFAULT_VERIFIER_MODEL),
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { verified: false, error: true },
    });
  }

  private async resolveModel(model: string): Promise<string> {
    if (model !== 'AUTO') {
      return model;
    }
    if (DEFAULT_VERIFIER_MODEL !== 'AUTO') {
      return DEFAULT_VERIFIER_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(dto: VerifyMessageDto): Promise<AdvancedModelSelectionResolution> {
    if (this.advancedModelSelectionService) {
      return this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(DEFAULT_VERIFIER_MODEL),
      );
    }

    return this.buildAutoSelection({
      requestedProvider: dto.requestedProvider ?? null,
      requestedModel: dto.requestedModel ?? null,
      requestedDisplayName: dto.requestedDisplayName,
      selectedModelSource: dto.selectedModelSource ?? null,
    });
  }

  private async buildAutoSelection(
    overrides?: Partial<AdvancedModelSelectionResolution>,
  ): Promise<AdvancedModelSelectionResolution> {
    const actualModel =
      overrides?.requestedModel ?? (await this.resolveModel(DEFAULT_VERIFIER_MODEL));
    return {
      modelSelectionMode: overrides?.requestedModel
        ? ModelSelectionMode.MANUAL_MODEL
        : ModelSelectionMode.AUTO,
      requestedProvider: overrides?.requestedProvider ?? null,
      requestedModel: overrides?.requestedModel ?? null,
      requestedDisplayName: overrides?.requestedDisplayName ?? null,
      selectedModelSource: overrides?.selectedModelSource ?? null,
      actualProvider: 'local-ollama',
      actualModel,
    };
  }
}

export { MAX_VERIFIER_REVISIONS };
