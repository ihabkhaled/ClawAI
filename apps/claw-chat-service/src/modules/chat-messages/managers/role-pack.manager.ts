import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DEFAULT_ROLE_PACK_MODEL,
  ROLE_PACK_TIMEOUT_MS,
  ROLE_PACKS,
} from '../constants/role-pack.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { RolePackMessageDto } from '../dto/role-pack-message.dto';
import type { RoleMember, RoleMemberResult, RolePackResponse } from '../types/role-pack.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { RoutingMode } from '../../../generated/prisma';

@Injectable()
export class RolePackManager {
  private readonly logger = new Logger(RolePackManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly localModelSelection?: LocalModelSelectionService,
  ) {}

  async executeRolePack(userId: string, dto: RolePackMessageDto): Promise<RolePackResponse> {
    this.logger.log(`executeRolePack: starting for user ${userId}, pack=${dto.pack}`);

    const threadId = await this.resolveThreadId(userId, dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { rolePackRequest: true },
    });

    void this.executeInBackground(threadId, dto.content, dto.pack);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(threadId: string, content: string, pack: string): Promise<void> {
    const startTime = Date.now();
    try {
      const members = ROLE_PACKS[pack] ?? [];
      const config = AppConfig.get();
      const resolvedMembers = await this.resolveMembers(members);
      const results = await this.runAllMembers(resolvedMembers, content, config.OLLAMA_SERVICE_URL);
      const allFailed = results.every((r) => r.output === 'Role failed');
      if (allFailed) {
        throw new Error('All role pack members failed to produce output');
      }
      const bestOutput = this.selectBestOutput(results, pack);

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: bestOutput,
        provider: 'local-ollama',
        model: await this.resolveModel(),
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        routingMode: RoutingMode.AUTO,
        metadata: { rolePack: true, pack, members: results },
      });

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', await this.resolveModel());
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
  ): Promise<RoleMemberResult[]> {
    const fallbackModel = await this.resolveModel();
    const settled = await Promise.allSettled(
      members.map((member) => this.runMember(member, content, ollamaUrl)),
    );

    return settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const msg = result.reason instanceof Error ? result.reason.message : 'Role failed';
      this.logger.warn(`runAllMembers: member ${String(index)} failed — ${msg}`);
      return {
        role: members[index]?.role ?? `role-${String(index)}`,
        model: members[index]?.model ?? fallbackModel,
        output: 'Role failed',
        latencyMs: 0,
      };
    });
  }

  private async runMember(
    member: RoleMember,
    content: string,
    ollamaUrl: string,
  ): Promise<RoleMemberResult> {
    const startTime = Date.now();
    const prompt = `${member.instruction}\n\n${content}`;
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

  private async resolveMembers(members: RoleMember[]): Promise<RoleMember[]> {
    return Promise.all(
      members.map(async (member) => ({
        ...member,
        model: await this.resolveModel(member.model),
      })),
    );
  }

  private selectBestOutput(results: RoleMemberResult[], pack: string): string {
    const members = ROLE_PACKS[pack] ?? [];
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
}
