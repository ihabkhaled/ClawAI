import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { recordGet } from '../../../common/utilities/record-lookup.utility';
import {
  DEFAULT_ROLE_PACK_MODEL,
  ROLE_PACK_TIMEOUT_MS,
  ROLE_PACKS,
} from '../constants/role-pack.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { AdvancedModuleModelSelectionService } from '../services/advanced-module-model-selection.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import { ResearchEnricherManager } from './research-enricher.manager';
import { prependResearchEvidence } from '../utilities/research-prompt.utility';
import type { RolePackMessageDto } from '../dto/role-pack-message.dto';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { RoleMember, RoleMemberResult, RolePackResponse } from '../types/role-pack.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { RoutingMode } from '../../../generated/prisma';

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
      selection,
      dto.researchMode,
      dto.researchProviderId,
      userToken,
    );

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    pack: string,
    selection?: AdvancedModelSelectionResolution,
    researchMode?: ResearchMode,
    researchProviderId?: string,
    userToken?: string,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const resolvedSelection = selection ?? (await this.buildAutoSelection());
      const members = recordGet(ROLE_PACKS, pack) ?? [];
      const config = AppConfig.get();
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
      const results = await this.runAllMembers(
        resolvedMembers,
        content,
        config.OLLAMA_SERVICE_URL,
        enrichment.systemPrompt,
      );
      const allFailed = results.every((r) => r.output === 'Role failed');
      if (allFailed) {
        throw new Error('All role pack members failed to produce output');
      }
      const bestOutput = this.selectBestOutput(results, pack);

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

      this.chatStreamService.emitCompletion(
        threadId,
        resolvedSelection.actualProvider,
        resolvedSelection.actualModel,
      );
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Role pack execution failed';
      this.logger.error(`executeInBackground: failed for thread ${threadId} - ${errorMsg}`);
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
    members: RoleMember[],
    content: string,
    ollamaUrl: string,
    researchEvidence: string,
  ): Promise<RoleMemberResult[]> {
    const fallbackModel = await this.resolveModel();
    const settled = await Promise.allSettled(
      members.map((member) => this.runMember(member, content, ollamaUrl, researchEvidence)),
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

  private async runMember(
    member: RoleMember,
    content: string,
    ollamaUrl: string,
    researchEvidence: string,
  ): Promise<RoleMemberResult> {
    const startTime = Date.now();
    const basePrompt = `${member.instruction}\n\n${content}`;
    const prompt = prependResearchEvidence(basePrompt, researchEvidence);
    const model = await this.resolveModel(member.model);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      think: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${ollamaUrl}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: ROLE_PACK_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${String(response.status)} for role ${member.role}`);
    }

    return {
      role: member.role,
      model,
      output: response.data.response.trim(),
      latencyMs: Date.now() - startTime,
    };
  }

  private async resolveMembers(
    members: RoleMember[],
    selection: AdvancedModelSelectionResolution,
  ): Promise<RoleMember[]> {
    if (selection.modelSelectionMode === 'MANUAL_MODEL') {
      return members.map((member) => ({ ...member, model: selection.actualModel }));
    }
    return Promise.all(
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
    if (DEFAULT_ROLE_PACK_MODEL !== 'AUTO') {
      return DEFAULT_ROLE_PACK_MODEL;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }

  private async resolveSelection(
    dto: RolePackMessageDto,
  ): Promise<AdvancedModelSelectionResolution> {
    if (this.advancedModelSelectionService) {
      return this.advancedModelSelectionService.resolveSelection(
        {
          modelSelectionMode: dto.modelSelectionMode,
          requestedProvider: dto.requestedProvider,
          requestedModel: dto.requestedModel,
          requestedDisplayName: dto.requestedDisplayName,
          selectedModelSource: dto.selectedModelSource,
        },
        await this.resolveModel(),
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
