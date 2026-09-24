import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { OrchestrationStageStatus } from '../../../common/enums/orchestration-stage-status.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { recordGet } from '../../../common/utilities/record-lookup.utility';
import { DEFAULT_ROLE_PACK_MODEL, ROLE_PACKS } from '../constants/role-pack.constants';
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
import type { RolePackMessageDto } from '../dto/role-pack-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import type { RoleMember, RoleMemberResult, RolePackResponse } from '../types/role-pack.types';
import { RoutingMode } from '../../../generated/prisma';
import { OLLAMA_PROVIDER } from '../../../common/constants';
import { PAYG_WORKFLOW_ROLE_PACK } from '../constants/payg.constants';

/**
 * Orchestrates role-based ensemble execution.
 *
 * Model selection semantics:
 * - AUTO: each role runs with its category-assigned local model (coder, reviewer, researcher, etc.)
 *   resolved from the installed-model inventory via LocalModelSelectionService.
 * - MANUAL_MODEL: ALL roles in the pack execute with the single user-selected model.
 *   Role specialization still drives prompt construction; only the execution model is unified.
 *   If the requested model is unsupported or unavailable, AdvancedModuleModelSelectionService
 *   throws BusinessException before any role runs (no silent fallback).
 */
@Injectable()
export class RolePackManager {
  private readonly logger = new Logger(RolePackManager.name);

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

  async executeRolePack(
    userId: string,
    dto: RolePackMessageDto,
    userToken: string,
  ): Promise<RolePackResponse> {
    this.logger.log(`executeRolePack: starting for user ${userId}, pack=${dto.pack}`);

    const threadId = await this.resolveThreadId(userId, dto);
    const selection = await this.resolveSelection(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { rolePackRequest: true, modelSelection: selection },
    });

    void this.executeInBackground(
      threadId,
      dto.content,
      dto.pack,
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
    pack: string,
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
      const members = recordGet(ROLE_PACKS, pack) ?? [];
      const resolvedMembers = await this.resolveMembers(members, resolvedSelection);
      // Enrich ONCE — every role member sees the same evidence; the FE badge
      // is rendered on the single ASSISTANT row this manager writes.
      const enrichment = await this.researchEnricherManager.enrichForOrchestration({
        threadId,
        mode: researchMode,
        query: content,
        userToken: userToken ?? '',
        providerId: researchProviderId,
      });
      // One bundle for the whole pack, built WITHOUT any member persona: the
      // roles answer the same question about the same conversation, files and
      // memories, so building it once means one set of retrievals for the run
      // instead of one per role.
      const bundle = await this.chatContextGateway.build({
        userId,
        threadId,
        surface: ChatSurface.ROLE_PACK,
        historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
        // The enricher's transcript used to be glued to the front of each
        // member's raw prompt by `prependResearchEvidence`, then merged as a
        // plain `personaInstruction` with no grounding flag.
        // `researchEvidenceInstruction` routes it through
        // `injectResearchEvidenceIntoContext`, which sets
        // `researchGroundingInjected` so the final-user-turn reminder fires for
        // every member of the pack.
        ...(enrichment.systemPrompt.length > 0
          ? { researchEvidenceInstruction: enrichment.systemPrompt }
          : {}),
        ...(fileIds !== undefined && fileIds.length > 0 ? { fileIds } : {}),
      });
      const results = await this.runAllMembers(threadId, resolvedMembers, content, bundle);
      const allFailed = results.every((r) => r.output === 'Role failed');
      if (allFailed) {
        throw new Error('All role pack members failed to produce output');
      }
      this.safeEmitStage(threadId, {
        label: 'Aggregating',
        status: OrchestrationStageStatus.ACTIVE,
        detail: `Selecting best output from ${String(results.length)} role(s)`,
        stageId: 'role-pack:aggregate',
      });
      const bestOutput = this.selectBestOutput(results, pack);
      this.safeEmitStage(threadId, {
        label: 'Aggregating',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'role-pack:aggregate',
      });

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: bestOutput,
        provider: resolvedSelection.actualProvider,
        model: resolvedSelection.actualModel,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        routingMode:
          resolvedSelection.modelSelectionMode === 'MANUAL_MODEL'
            ? RoutingMode.MANUAL_MODEL
            : RoutingMode.AUTO,
        metadata: {
          rolePack: true,
          pack,
          members: results,
          modelSelection: resolvedSelection,
          ...(enrichment.transcript === null ? {} : { researchTranscript: enrichment.transcript }),
        },
      });

      this.safeEmitStage(threadId, {
        label: 'Complete',
        status: OrchestrationStageStatus.COMPLETED,
        stageId: 'role-pack:complete',
      });
      this.chatStreamService.emitCompletion(
        threadId,
        resolvedSelection.actualProvider,
        resolvedSelection.actualModel,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Role pack execution failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
      this.safeEmitStage(threadId, {
        label: 'Role pack failed',
        status: OrchestrationStageStatus.ERROR,
        detail: errorMsg,
        stageId: 'role-pack:error',
      });
      this.chatStreamService.emitError(threadId, errorMsg);
      try {
        await this.storeErrorMessage(threadId, errorMsg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Store failed';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async runAllMembers(
    threadId: string,
    members: RoleMember[],
    content: string,
    bundle: ChatContextBundle,
  ): Promise<RoleMemberResult[]> {
    const fallbackModel = await this.resolveModel();
    const settled = await Promise.allSettled(
      members.map((member) => {
        const stageId = `role-pack:role:${member.role}`;
        this.safeEmitStage(threadId, {
          label: `Role ${member.role} dispatched`,
          status: OrchestrationStageStatus.ACTIVE,
          detail: member.model ?? 'local-ollama',
          stageId,
        });
        return this.runMember(member, content, bundle).then(
          (value) => {
            this.safeEmitStage(threadId, {
              label: `Role ${member.role} returned`,
              status: OrchestrationStageStatus.COMPLETED,
              detail: `${value.model} — ${String(value.latencyMs)}ms`,
              stageId,
            });
            return value;
          },
          (reason: unknown) => {
            const errMsg = reason instanceof Error ? reason.message : 'Role failed';
            this.safeEmitStage(threadId, {
              label: `Role ${member.role} returned`,
              status: OrchestrationStageStatus.ERROR,
              detail: errMsg,
              stageId,
            });
            throw reason instanceof Error ? reason : new Error(errMsg);
          },
        );
      }),
    );

    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const msg = result.reason instanceof Error ? result.reason.message : 'Role failed';
      this.logger.warn(`runAllMembers: member ${String(index)} failed — ${msg}`);
      const member = members.at(index);
      return {
        role: member?.role ?? `role-${String(index)}`,
        model: member?.model ?? fallbackModel,
        output: 'Role failed',
        latencyMs: 0,
      };
    });
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
   * One role, through the same chokepoint a chat turn uses.
   *
   * This used to build an `OllamaGenerateRequest` by hand and post it at
   * `/api/v1/ollama/generate`, which pinned every role to a local model — an
   * account with only a cloud connector could not run a pack at all — and
   * metered through `meterOrchestrationCall` plus a hand-rolled `recordUsage`,
   * a second path to the ledger that `callProvider` already owns.
   *
   * The role's instruction now reaches the model as a persona rather than as
   * prompt text glued in front of the user's words. Gluing it on made the role
   * part of what the user appeared to have typed, so the model answered the
   * concatenation instead of being told who to be.
   */
  private async runMember(
    member: RoleMember,
    content: string,
    bundle: ChatContextBundle,
  ): Promise<RoleMemberResult> {
    const startTime = Date.now();
    const model = await this.resolveModel(member.model);
    const parsed = parseJudgeModel(model);
    const provider = parsed.provider ?? OLLAMA_PROVIDER;

    const response = await this.modeExecutionGateway.run({
      bundle: this.withMemberPersona(bundle, member.instruction),
      prompt: content,
      provider,
      model: parsed.model.length > 0 ? parsed.model : model,
      ledgerContext: TokenLedgerContext.ROLE_PACK,
      paygCall: {
        workflow: PAYG_WORKFLOW_ROLE_PACK,
        requestId: `role-pack:member:${randomUUID()}`,
      },
    });

    return {
      role: member.role,
      model,
      output: (response.content ?? '').trim(),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * The member's persona, derived locally from the pack's single bundle.
   *
   * Asking the context gateway again per member would re-run history, memory,
   * attachment and cross-thread retrieval N times to produce N bundles that
   * differ by one string — a four-role pack would pay four times for identical
   * retrievals. The gateway's own `personaInstruction` handling is exactly this
   * append, so doing it here is the same result at one retrieval set.
   *
   * Appended, never replacing: the thread's system prompt and the research
   * evidence already in the shared bundle are the user's instructions, and a
   * role is an addition to them.
   */
  private withMemberPersona(bundle: ChatContextBundle, instruction: string): ChatContextBundle {
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

  private async resolveMembers(
    members: RoleMember[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<RoleMember[]> {
    return selection.modelSelectionMode === 'MANUAL_MODEL' ? members.map((member) => ({ ...member, model: selection.actualModel })) : Promise.all(
      members.map(async (member) => ({
        ...member,
        model: await this.resolveModel(member.model),
      })),
    );
  }

  private selectBestOutput(results: RoleMemberResult[], pack: string): string {
    const members = recordGet(ROLE_PACKS, pack) ?? [];
    const lastMember = members.at(-1);

    if (lastMember) {
      const finalResult = results.find(
        (r) => r.role === lastMember.role && r.output !== 'Role failed',
      );
      if (finalResult) {
        return finalResult.output;
      }
    }

    const firstSuccess = results.find((r) => r.output !== 'Role failed' && r.output.length > 0);
    return firstSuccess?.output ?? 'All roles failed to produce output.';
  }

  private async resolveThreadId(userId: string, dto: RolePackMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Role Pack [${dto.pack}]: ${dto.content.slice(0, 50)}`,
      routingMode: RoutingMode.AUTO,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `\u26A0\uFE0F ${errorMsg}`,
      provider: 'local-ollama',
      model: await this.resolveModel(),
      routingMode: RoutingMode.AUTO,
      usedFallback: true,
      metadata: { error: true },
    });
  }

  private async resolveModel(model?: string): Promise<string> {
    if (model && model !== 'AUTO') {
      return model;
    }
    return DEFAULT_ROLE_PACK_MODEL !== 'AUTO' ? DEFAULT_ROLE_PACK_MODEL : this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(
    dto: RolePackMessageDto,
  ): Promise<AdvancedModelSelectionResolution> {
    return this.advancedModelSelectionService ? this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(),
      ) : this.buildAutoSelection({
      requestedProvider: dto.requestedProvider ?? null,
      requestedModel: dto.requestedModel ?? null,
      requestedDisplayName: dto.requestedDisplayName,
      selectedModelSource: dto.selectedModelSource ?? null,
    });
  }

  private async buildAutoSelection(
    overrides?: Partial<AdvancedModelSelectionResolution>,
  ): Promise<AdvancedModelSelectionResolution> {
    const actualModel = overrides?.requestedModel ?? (await this.resolveModel());
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
