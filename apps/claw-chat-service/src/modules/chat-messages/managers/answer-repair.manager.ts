import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { RepairType } from '../../../common/enums/repair-type.enum';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { REPAIR_GENERATION_TIMEOUT_MS } from '../constants/answer-repair.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { RepairMessageDto } from '../dto/repair-message.dto';
import type { AnswerRepairResponse } from '../types/answer-repair.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { type RoutingMode } from '../../../generated/prisma';

@Injectable()
export class AnswerRepairManager {
  private readonly logger = new Logger(AnswerRepairManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeRepair(userId: string, dto: RepairMessageDto): Promise<AnswerRepairResponse> {
    this.logger.log(
      `executeRepair: starting repair for user ${userId} with types=${dto.repairTypes.join(',')}`,
    );

    const threadId = await this.resolveThreadId(userId, dto);
    const originalContent = await this.resolveOriginalContent(dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: `Repair request: ${originalContent.slice(0, 100)}...`,
      metadata: { repairRequest: true, repairTypes: dto.repairTypes },
    });

    void this.executeInBackground(
      threadId,
      originalContent,
      dto.repairTypes,
      dto.targetProvider,
      dto.targetModel,
    );

    return { messageId: userMessage.id, threadId };
  }

  private async executeInBackground(
    threadId: string,
    originalContent: string,
    repairTypes: RepairType[],
    targetProvider: string | undefined,
    targetModel: string | undefined,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const repairedContent = await this.callRepairLlm(
        originalContent,
        repairTypes,
        targetModel,
        startTime,
      );

      const provider = targetProvider ?? 'local-ollama';
      const model = await this.resolveModel(targetModel);

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
        },
      });

      this.logger.log(
        `executeInBackground: repair complete for thread ${threadId}, types=${repairTypes.join(',')}`,
      );
      this.chatStreamService.emitCompletion(threadId, provider, model);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: repair failed for thread ${threadId} — ${msg}`);
      this.chatStreamService.emitError(threadId, `Answer repair failed: ${msg}`);
      try {
        await this.storeErrorMessage(threadId, msg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Unknown store error';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async callRepairLlm(
    originalContent: string,
    repairTypes: RepairType[],
    targetModel: string | undefined,
    _startTime: number,
  ): Promise<string> {
    const config = AppConfig.get();
    const repairPrompt = this.buildRepairPrompt(originalContent, repairTypes);
    const model = await this.resolveModel(targetModel);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt: repairPrompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: REPAIR_GENERATION_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Ollama repair returned status ${String(response.status)}`);
    }

    const repaired = response.data.response.trim();
    if (repaired.length === 0) {
      throw new Error('Ollama returned an empty repair response');
    }

    return repaired;
  }

  buildRepairPrompt(content: string, repairTypes: RepairType[]): string {
    const instructions = repairTypes.map((type) => this.getRepairInstruction(type)).join('\n');

    return `You are a precision answer repair assistant. Repair the following answer based on the requested repair types.

Repair types requested:
${instructions}

Original answer to repair:
---
${content}
---

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
    return instructions[repairType];
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
    if (model && model !== 'AUTO') {
      return model;
    }
    return this.localModelSelection?.resolveDefaultModel() ?? 'AUTO';
  }
}
