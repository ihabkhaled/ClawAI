import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  DEFAULT_PIPELINE_MODEL,
  PIPELINE_STAGE_TIMEOUT_MS,
  PIPELINE_TEMPLATES,
} from '../constants/pipeline.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import type { PipelineMessageDto } from '../dto/pipeline-message.dto';
import type { PipelineResponse, PipelineStage, PipelineStageResult } from '../types/pipeline.types';
import type { OllamaGenerateRequest, OllamaGenerateResponse } from '../types/execution.types';
import { type RoutingMode } from '../../../generated/prisma';

@Injectable()
export class PipelineManager {
  private readonly logger = new Logger(PipelineManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
  ) {}

  async executePipeline(userId: string, dto: PipelineMessageDto): Promise<PipelineResponse> {
    this.logger.log(`executePipeline: starting for user ${userId}`);

    const threadId = await this.resolveThreadId(userId, dto);

    const userMessage = await this.chatMessagesRepository.create({
      threadId,
      role: 'USER',
      content: dto.content,
      metadata: { pipelineRequest: true },
    });

    void this.executeInBackground(threadId, dto.content, dto);

    return { messageId: userMessage.id, threadId };
  }

  async executeInBackground(
    threadId: string,
    content: string,
    dto: PipelineMessageDto,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const stages = this.resolveStages(dto);
      const config = AppConfig.get();
      const stageResults = await this.runAllStages(stages, content, config.OLLAMA_SERVICE_URL);
      const finalOutput = stageResults.at(-1)?.output ?? content;

      await this.chatMessagesRepository.create({
        threadId,
        role: 'ASSISTANT',
        content: finalOutput,
        provider: 'local-ollama',
        model: DEFAULT_PIPELINE_MODEL,
        latencyMs: Date.now() - startTime,
        usedFallback: false,
        metadata: {
          pipeline: true,
          template: dto.template,
          stages: stageResults,
          stageCount: stageResults.length,
        },
      });

      this.chatStreamService.emitCompletion(threadId, 'local-ollama', DEFAULT_PIPELINE_MODEL);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Pipeline execution failed';
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

  private resolveStages(dto: PipelineMessageDto): PipelineStage[] {
    if (dto.template !== 'custom') {
      return PIPELINE_TEMPLATES[dto.template] ?? [];
    }
    return dto.customStages ?? [];
  }

  private async runAllStages(
    stages: PipelineStage[],
    content: string,
    ollamaUrl: string,
  ): Promise<PipelineStageResult[]> {
    const results: PipelineStageResult[] = [];
    let previousOutput = content;

    for (const stage of stages) {
      const result = await this.runStage(stage, previousOutput, ollamaUrl);
      results.push(result);
      previousOutput = result.output;
    }

    return results;
  }

  private async runStage(
    stage: PipelineStage,
    input: string,
    ollamaUrl: string,
  ): Promise<PipelineStageResult> {
    const startTime = Date.now();
    const prompt = `${stage.instruction}\n\n${input}`;

    const requestBody: OllamaGenerateRequest = {
      model: stage.model,
      prompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${ollamaUrl}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: PIPELINE_STAGE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(
        `Pipeline stage "${stage.name}" failed with status ${String(response.status)}`,
      );
    }

    return {
      stageName: stage.name,
      model: stage.model,
      output: response.data.response.trim(),
      latencyMs: Date.now() - startTime,
    };
  }

  private async resolveThreadId(userId: string, dto: PipelineMessageDto): Promise<string> {
    if (dto.threadId && dto.threadId.length > 0) {
      return dto.threadId;
    }
    const thread = await this.chatThreadsRepository.create({
      userId,
      title: `Pipeline: ${dto.content.slice(0, 50)}`,
      routingMode: 'MANUAL_MODEL' as RoutingMode,
    });
    return thread.id;
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Pipeline execution failed: ${errorMsg}`,
      provider: 'pipeline',
      model: 'pipeline',
      usedFallback: false,
      metadata: { pipeline: false, error: true },
    });
  }
}
