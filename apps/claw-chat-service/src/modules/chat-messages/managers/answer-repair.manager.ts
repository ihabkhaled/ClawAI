import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { RepairType } from '../../../common/enums/repair-type.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
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
import type { RepairMessageDto } from '../dto/repair-message.dto';
import type { AnswerRepairResponse } from '../types/answer-repair.types';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import { type RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_ANSWER_REPAIR } from '../constants/payg.constants';

/**
 * Repairs an answer — with the conversation that produced it.
 *
 * This mode used to build one string, `buildRepairPrompt(originalContent,
 * repairTypes)`, and post it at `/api/v1/ollama/generate`. That carried the
 * same defect the judge had: the repairer saw the answer but not the question,
 * so a COMPLETENESS or FACTUALITY pass was scoring text against nothing. "Is
 * this complete?" has no answer without knowing what was asked, which files
 * were attached, or what the thread's system prompt told the model to be — and
 * the repairer was given none of it.
 *
 * Two further consequences nobody chose: the raw post pinned every repair to a
 * local model (an account with only a cloud connector could not repair at all),
 * and it metered through `meterOrchestrationCall` plus a hand-rolled
 * `recordUsage` — a second path to the ledger that `callProvider` already owns.
 */
@Injectable()
export class AnswerRepairManager {
  private readonly logger = new Logger(AnswerRepairManager.name);

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

  async executeRepair(
    userId: string,
    dto: RepairMessageDto,
    userToken: string,
  ): Promise<AnswerRepairResponse> {
    this.logger.log(
      `executeRepair: starting repair for user ${userId} with types=${dto.repairTypes.join(',')}`,
    );

    const threadId = await this.resolveThreadId(userId, dto);
    const originalContent = await this.resolveOriginalContent(dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: `Repair request: ${originalContent.slice(0, 100)}...`,
      metadata: {
        repairRequest: true,
        repairTypes: dto.repairTypes,
        modelSelection: selection,
      },
    });

    void this.executeInBackground(
      threadId,
      originalContent,
      dto.repairTypes,
      userId,
      selection,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
      // The DTO DOES carry a message id: `repairMessageSchema.messageId` names
      // the earlier message being repaired. It is forwarded so the bundle is
      // the history AS IT WAS at that message — repairing turn 3 must not read
      // turns 4 through 20, which is precisely what `windowAt` is for.
      dto.messageId,
      dto.fileIds,
    );

    return { messageId: userMessage.id, threadId };
  }

  private async executeInBackground(
    threadId: string,
    originalContent: string,
    repairTypes: RepairType[],
    userId: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
    routedMessageId?: string,
    fileIds?: string[],
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      this.safeEmitStage(threadId, {
        label: 'Generating draft',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Analyzing original answer for ${String(repairTypes.length)} repair type(s)`,
        stageId: 'repair:draft',
      });
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: originalContent,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // One bundle: the conversation, files, memories and thread system prompt
      // the answer under repair was produced from. Without it a repair pass is
      // rewriting text it cannot check against anything.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.REPAIR,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // Cut the history at the message being repaired, so the pass does not
        // read everything said after the answer it is fixing.
        ...(routedMessageId === undefined ? {} : { routedMessageId }),
        // The enricher's transcript used to be glued to the front of the repair
        // prompt by `prependResearchEvidence`. It is an instruction about how to
        // answer, so it belongs in the system prompt beside the user's own —
        // appended, never replacing.
        ...(enrichment.systemPrompt.length > 0
          ? { personaInstruction: enrichment.systemPrompt }
          : {}),
        ...(fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {}),
      });
      this.safeEmitStage(threadId, {
        label: 'Draft critique',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Repair types: ${repairTypes.join(', ')}`,
        stageId: 'repair:critique',
      });
      const repairedContent = await this.callRepairLlm(
        bundle,
        originalContent,
        repairTypes,
        resolvedSelection,
      );

      const provider = resolvedSelection.actualProvider;
      const model = resolvedSelection.actualModel;
      this.safeEmitStage(threadId, {
        label: 'Repair applied',
        status: OrchestrationStageStatus.COMPLETED,
        detail: `${provider}/${model}`,
        stageId: 'repair:applied',
      });

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: repairedContent,
        provider,
        model,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        metadata: {
          repaired: true,
          repairTypes,
          repairProvider: provider,
          repairModel: model,
          modelSelection: resolvedSelection,
          ...(enrichment.transcript === null ? {} : { researchTranscript: enrichment.transcript }),
        },
      });

      this.logger.log(
        `executeInBackground: repair complete for thread ${threadId}, types=${repairTypes.join(',')}`,
      );
      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'repair:complete',
      });
      this.chatStreamService.emitCompletion(threadId, provider, model);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: repair failed for thread ${threadId} — ${msg}`);
      this.safeEmitStage(threadId, {
        label: 'Repair failed',
        status: OrchestrationStageStatus.ERROR,
        detail: msg,
        stageId: 'repair:error',
      });
      this.chatStreamService.emitError(threadId, `Answer repair failed: ${msg}`);
      try {
        await this.storeErrorMessage(threadId, msg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Unknown store error';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  /**
   * The repair hop, through the same chokepoint a chat turn uses.
   *
   * The repair instruction is a PERSONA, not prompt text. Gluing it in front of
   * the answer made the rubric part of what the user appeared to have typed, so
   * the model answered the concatenation instead of being told what job to do —
   * the same mistake role-pack made with its role instructions. The answer being
   * repaired is the `prompt`, appended as a user turn after the real
   * conversation rather than replacing it.
   */
  private async callRepairLlm(
    bundle: ChatContextBundle,
    originalContent: string,
    repairTypes: RepairType[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<string> {
    const model = selection.actualModel;
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle: this.withRepairPersona(bundle, this.buildRepairPersona(repairTypes)),
      prompt: originalContent,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.REPAIR,
      paygCall: {
        workflow: PAYG_WORKFLOW_ANSWER_REPAIR,
        requestId: `answer-repair:repair:${randomUUID()}`,
      },
    });

    // No `recordUsage` here: `callProvider` is the universal token-deduction
    // chokepoint and records every call that passes through it. The hand-rolled
    // one this method used to make was a second path to the same ledger.
    const repaired = (response.content ?? '').trim();
    if (repaired.length === 0) {
      throw new Error('The repair model returned an empty response');
    }

    return repaired;
  }

  /**
   * The repair rubric as a persona, derived locally from the single bundle.
   *
   * Asking the context gateway again just to attach this string would re-run
   * history, memory, attachment and cross-thread retrieval for a bundle that
   * differs by one field. The gateway's own `personaInstruction` handling is
   * exactly this append, so doing it here is the same result at one retrieval
   * set.
   *
   * Appended, never replacing: the thread's system prompt and the research
   * evidence already in the bundle are the user's instructions, and a repair
   * rubric is an addition to them.
   */
  private withRepairPersona(bundle: ChatContextBundle, instruction: string): ChatContextBundle {
    if (instruction.trim().length === 0) {
      return bundle;
    }
    const existing = bundle.context.systemPrompt;
    return {
      ...bundle,
      context: {
        ...bundle.context,
        systemPrompt:
          existing === null || existing.trim().length === 0
            ? instruction
            : `${existing}\n\n${instruction}`,
      },
    };
  }

  /**
   * The repair types, framed as who the model is for this call.
   *
   * This is `buildRepairPrompt` with the answer taken out of it: the answer now
   * reaches the model as the prompt turn, so the rubric no longer has to carry
   * a copy of it.
   */
  buildRepairPersona(repairTypes: RepairType[]): string {
    const instructions = repairTypes.map((type) => this.getRepairInstruction(type)).join('\n');

    return `You are a precision answer repair assistant. Repair the answer in the user's last message based on the requested repair types.

Repair types requested:
${instructions}

Return ONLY the repaired answer. Do not explain what you changed. Do not add preamble.`;
  }

  private getRepairInstruction(repairType: RepairType): string {
    const instructions: Record<RepairType, string> = {
      [RepairType.SCHEMA]:
        '- SCHEMA: Fix any malformed JSON, incorrect structure, or data format issues',
      [RepairType.FORMAT]:
        '- FORMAT: Fix markdown formatting, headers, lists, code blocks, and overall structure',
      [RepairType.COMPLETENESS]:
        '- COMPLETENESS: Expand shallow or incomplete sections, add missing key points',
      [RepairType.FACTUALITY]:
        '- FACTUALITY: Identify and correct factual errors, hallucinations, or incorrect claims',
    };
    return Object.entries(instructions).find(([k]) => k === repairType)?.[1] ?? '';
  }

  private async resolveThreadId(userId: string, dto: RepairMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Repair: ${(dto.content ?? '').slice(0, 50)}`,
      routingMode: 'MANUAL_MODEL' as RoutingMode,
    });
    return thread.id;
  }

  private async resolveOriginalContent(dto: RepairMessageDto): Promise<string> {
    if (dto.content !== undefined && dto.content.length > 0) {
      return dto.content;
    }
    if (dto.messageId !== undefined) {
      const message = await this.chatMessagesRepository.findById(dto.messageId);
      if (message) {
        return message.content;
      }
    }
    throw new Error('Could not resolve original content to repair');
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Answer repair failed: ${errorMsg}`,
      provider: 'repair',
      model: 'repair',
      usedFallback: false,
      metadata: { repaired: false, error: true },
    });
  }

  private async resolveModel(model?: string): Promise<string> {
    return model && model !== 'AUTO' ? model : this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
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

  private async resolveSelection(dto: RepairMessageDto): Promise<AdvancedModelSelectionResolution> {
    return this.advancedModelSelectionService ? this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider ?? dto.targetProvider,
          requestedModel: dto.requestedModel ?? dto.targetModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(),
      ) : this.buildAutoSelection({
      requestedProvider: dto.requestedProvider ?? dto.targetProvider ?? 'local-ollama',
      requestedModel: dto.requestedModel ?? dto.targetModel ?? null,
      requestedDisplayName: dto.requestedDisplayName,
      selectedModelSource: dto.selectedModelSource ?? null,
    });
  }

  private async buildAutoSelection(
    overrides?: Partial<AdvancedModelSelectionResolution>,
  ): Promise<AdvancedModelSelectionResolution> {
    const actualModel =
      overrides?.actualModel ?? overrides?.requestedModel ?? (await this.resolveModel());
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
