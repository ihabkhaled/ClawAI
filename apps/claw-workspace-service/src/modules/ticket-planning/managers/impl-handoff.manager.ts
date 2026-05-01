import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { buildAuthHeader } from '../../../common/utilities/file-service-client.utility';
import {
  IMPL_HANDOFF_BRIEF_SNIPPET_MAX_CHARS,
  IMPL_HANDOFF_HTTP_TIMEOUT_MS,
} from '../constants/ticket-planning.constants';
import { ImplHandoffRepository } from '../repositories/impl-handoff.repository';
import { scanForSecrets } from '../utilities/secret-scanner.utility';
import type { HandoffPayload } from '../types/impl-handoff.types';
import type { ImplPromptHandoff, ImplPromptHandoffMode, ImplPromptHandoffStatus } from '../../../generated/prisma';

@Injectable()
export class ImplHandoffManager {
  private readonly logger = new Logger(ImplHandoffManager.name);

  constructor(
    private readonly repo: ImplHandoffRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async handoff(input: {
    sourceQueueId: string;
    userId: string;
    mode: ImplPromptHandoffMode;
    brief: string;
  }): Promise<HandoffPayload> {
    this.logger.log(
      `handoff: sourceQueueId=${input.sourceQueueId} mode=${input.mode} userId=${input.userId}`,
    );
    const scan = scanForSecrets(input.brief);
    if (scan.hasSecret) {
      throw new BusinessException(
        'workspace.implPrompt.secretDetected',
        'IMPL_PROMPT_SECRET_DETECTED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { matchedPatternIndex: scan.matchedPatternIndex },
      );
    }
    const handoff = await this.repo.create({
      sourceQueueId: input.sourceQueueId,
      userId: input.userId,
      mode: input.mode,
      briefSnippet: input.brief.slice(0, IMPL_HANDOFF_BRIEF_SNIPPET_MAX_CHARS),
    });
    void this.rabbitmq.publish(EventPattern.AI_ACTION_SUGGESTION_CREATED, {
      handoffId: handoff.id,
      mode: input.mode,
      userId: input.userId,
      sourceQueueId: input.sourceQueueId,
    });

    try {
      const result = await this.dispatch(input.mode, input.userId, input.brief);
      const updated = await this.repo.markDelivered(handoff.id, result);
      this.logger.log(`handoff: delivered handoffId=${handoff.id} mode=${input.mode}`);
      return this.toPayload(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`handoff: failed handoffId=${handoff.id} — ${message}`);
      const updated = await this.repo.markFailed(handoff.id, message);
      return this.toPayload(updated);
    }
  }

  async list(
    userId: string,
    status: ImplPromptHandoffStatus | undefined,
    limit: number,
  ): Promise<HandoffPayload[]> {
    const rows = await this.repo.listForUser(userId, status, limit);
    return rows.map((r) => this.toPayload(r));
  }

  async getById(id: string): Promise<HandoffPayload | null> {
    const row = await this.repo.findById(id);
    return row === null ? null : this.toPayload(row);
  }

  private async dispatch(
    mode: ImplPromptHandoffMode,
    userId: string,
    brief: string,
  ): Promise<{ targetThreadId?: string; targetTerminalCommandId?: string }> {
    if (mode === 'CHAT') {
      const threadId = await this.dispatchToChat(userId, brief);
      return { targetThreadId: threadId };
    }
    if (mode === 'AGENT') {
      const commandId = await this.dispatchToAgent(userId, brief);
      return { targetTerminalCommandId: commandId };
    }
    // CLIPBOARD — caller renders the brief locally; nothing to dispatch.
    return {};
  }

  private async dispatchToChat(userId: string, brief: string): Promise<string> {
    const config = AppConfig.get();
    const url = `${config.CHAT_SERVICE_URL}/api/v1/internal/chat/threads/seeded`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify({
        userId,
        systemPrompt:
          'You are a senior engineer briefed for an implementation task. Use the brief below verbatim as the source of truth. Ask clarifying questions before writing code if anything is ambiguous.',
        initialUserMessage: brief,
        title: 'IMPL_PROMPT handoff',
      }),
      signal: AbortSignal.timeout(IMPL_HANDOFF_HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`chat-service seed-thread ${String(response.status)}: ${text.slice(0, 200)}`);
    }
    const data = (await response.json()) as { threadId?: string };
    if (data.threadId === undefined) {
      throw new Error('chat-service seed-thread returned no threadId');
    }
    return data.threadId;
  }

  private async dispatchToAgent(userId: string, brief: string): Promise<string> {
    const config = AppConfig.get();
    const url = `${config.AGENT_SERVICE_URL}/api/v1/internal/agent/terminal/seed-command`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify({ userId, brief }),
      signal: AbortSignal.timeout(IMPL_HANDOFF_HTTP_TIMEOUT_MS),
    });
    if (response.status === 409) {
      throw new BusinessException(
        'workspace.implPrompt.noActiveAgentDevice',
        'NO_ACTIVE_AGENT_DEVICE',
        HttpStatus.CONFLICT,
      );
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`agent-service seed-command ${String(response.status)}: ${text.slice(0, 200)}`);
    }
    const data = (await response.json()) as { terminalCommandId?: string };
    if (data.terminalCommandId === undefined) {
      throw new Error('agent-service seed-command returned no terminalCommandId');
    }
    return data.terminalCommandId;
  }

  private toPayload(row: ImplPromptHandoff): HandoffPayload {
    return {
      id: row.id,
      sourceQueueId: row.sourceQueueId,
      userId: row.userId,
      mode: row.mode,
      targetThreadId: row.targetThreadId,
      targetTerminalCommandId: row.targetTerminalCommandId,
      status: row.status,
      errorMessage: row.errorMessage,
      briefSnippet: row.briefSnippet,
      createdAt: row.createdAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
    };
  }
}
