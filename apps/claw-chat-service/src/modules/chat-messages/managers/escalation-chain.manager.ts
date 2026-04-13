import { Injectable, Logger } from '@nestjs/common';

import { EscalationChainStatus } from '../../../common/enums/escalation-chain-status.enum';
import { DEFAULT_QUALITY_THRESHOLD } from '../constants/escalation-chain.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ChatStreamService } from '../services/chat-stream.service';
import type {
  EscalationChainResponse,
  EscalationChainResult,
  EscalationChainStep,
  EscalationStepResult,
} from '../types/escalation-chain.types';
import type { AssembledContext } from '../types/context.types';
import type { ThreadSettings } from '../types/execution.types';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';
import { QualityCheckManager } from './quality-check.manager';
import { type ChatThread } from '../../../generated/prisma';

@Injectable()
export class EscalationChainManager {
  private readonly logger = new Logger(EscalationChainManager.name);

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly chatStreamService: ChatStreamService,
    private readonly qualityCheckManager: QualityCheckManager,
  ) {}

  async executeEscalationChain(
    userId: string,
    threadId: string,
    content: string,
    chain: EscalationChainStep[],
    fileIds?: string[],
  ): Promise<EscalationChainResponse> {
    this.logger.log(
      `executeEscalationChain: queuing ${String(chain.length)}-step chain in thread ${threadId}`,
    );

    const userMessage = await this.storeUserMessage(threadId, content, fileIds);

    void this.executeInBackground(userId, threadId, content, chain, fileIds);

    return { messageId: userMessage.id, threadId, prompt: content };
  }

  private async executeInBackground(
    userId: string,
    threadId: string,
    content: string,
    chain: EscalationChainStep[],
    fileIds?: string[],
  ): Promise<void> {
    try {
      const { context, threadSettings } = await this.buildContext(userId, threadId, fileIds);
      const result = await this.runChain(content, chain, context, threadSettings);
      await this.storeChainResult(threadId, result);

      this.logger.log(
        `executeInBackground: escalation done — stepUsed=${String(result.stepUsed)}/${String(result.totalSteps)} status=${result.status}`,
      );
      this.chatStreamService.emitCompletion(threadId, result.finalProvider, result.finalModel);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`executeInBackground: escalation chain failed — ${msg}`);
      this.chatStreamService.emitError(threadId, `Escalation chain failed: ${msg}`);
      try {
        await this.storeErrorMessage(threadId, msg);
      } catch (storeError: unknown) {
        const storeMsg = storeError instanceof Error ? storeError.message : 'Unknown store error';
        this.logger.error(`executeInBackground: failed to store error message — ${storeMsg}`);
      }
    }
  }

  private async buildContext(
    userId: string,
    threadId: string,
    fileIds?: string[],
  ): Promise<{ context: AssembledContext; threadSettings: ThreadSettings | undefined }> {
    const thread = await this.chatThreadsRepository.findById(threadId);
    const threadSettings = this.extractThreadSettings(thread);
    const threadMessages = await this.chatMessagesRepository.findRecentByThreadId(threadId, 20);
    const chronologicalMessages = [...threadMessages].reverse();
    const context = await this.contextAssemblyManager.assemble(
      userId,
      chronologicalMessages,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds,
    );
    return { context, threadSettings };
  }

  private async runChain(
    content: string,
    chain: EscalationChainStep[],
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<EscalationChainResult> {
    const stepResults: EscalationStepResult[] = [];

    for (let i = 0; i < chain.length; i++) {
      const step = chain[i];
      if (!step) {
        continue;
      }

      const stepResult = await this.executeStep(i + 1, step, content, context, threadSettings);
      stepResults.push(stepResult);

      if (stepResult.passed) {
        return this.buildPassedResult(stepResult, i + 1, chain.length, stepResults);
      }

      this.logger.log(
        `runChain: step ${String(i + 1)} quality score ${String(stepResult.qualityScore.toFixed(2))} below threshold — escalating`,
      );
    }

    const lastStep = chain.at(-1);

    return {
      finalAnswer: this.selectBestAnswer(stepResults),
      stepUsed: chain.length,
      totalSteps: chain.length,
      escalated: chain.length > 1,
      status: EscalationChainStatus.EXHAUSTED,
      stepResults,
      finalProvider: lastStep?.provider ?? 'unknown',
      finalModel: lastStep?.model ?? 'unknown',
    };
  }

  private selectBestAnswer(stepResults: EscalationStepResult[]): string {
    const successful = stepResults.filter((r) => r.errorMessage === null && r.content !== null);
    if (successful.length === 0) {
      return 'All escalation steps failed to produce a valid response';
    }
    const best = successful.reduce((prev, cur) =>
      cur.qualityScore > prev.qualityScore ? cur : prev,
    );
    return best.content ?? 'No content available';
  }

  private buildPassedResult(
    passedStepResult: EscalationStepResult,
    stepUsed: number,
    totalSteps: number,
    stepResults: EscalationStepResult[],
  ): EscalationChainResult {
    const status =
      stepUsed === 1 ? EscalationChainStatus.SINGLE_STEP : EscalationChainStatus.RESOLVED_AT_STEP;

    return {
      finalAnswer: passedStepResult.content ?? '',
      stepUsed,
      totalSteps,
      escalated: stepUsed > 1,
      status,
      stepResults,
      finalProvider: passedStepResult.provider,
      finalModel: passedStepResult.model,
    };
  }

  private async executeStep(
    stepNumber: number,
    step: EscalationChainStep,
    content: string,
    context: AssembledContext,
    threadSettings: ThreadSettings | undefined,
  ): Promise<EscalationStepResult> {
    const startTime = Date.now();
    try {
      const llmResponse = await this.chatExecutionManager.callProvider(
        step.provider,
        step.model,
        context,
        startTime,
        false,
        threadSettings,
      );

      const qualityResult = this.qualityCheckManager.checkResponseQuality(
        llmResponse.content,
        content,
        threadSettings,
      );

      const threshold = step.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
      const passed = qualityResult.score >= threshold;

      this.logger.debug(
        `executeStep: step ${String(stepNumber)} ${step.provider}/${step.model} score=${String(qualityResult.score.toFixed(2))} threshold=${String(threshold)} passed=${String(passed)}`,
      );

      return {
        step: stepNumber,
        provider: step.provider,
        model: step.model,
        content: llmResponse.content,
        qualityScore: qualityResult.score,
        passed,
        latencyMs: llmResponse.latencyMs,
        errorMessage: null,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `executeStep: step ${String(stepNumber)} ${step.provider}/${step.model} failed — ${errorMessage}`,
      );
      return {
        step: stepNumber,
        provider: step.provider,
        model: step.model,
        content: null,
        qualityScore: 0,
        passed: false,
        latencyMs: Date.now() - startTime,
        errorMessage,
      };
    }
  }

  private async storeUserMessage(
    threadId: string,
    content: string,
    fileIds?: string[],
  ): Promise<{ id: string }> {
    const metadata = fileIds && fileIds.length > 0 ? { fileIds } : undefined;
    return this.chatMessagesRepository.create({ threadId, role: 'USER', content, metadata });
  }

  private async storeChainResult(threadId: string, result: EscalationChainResult): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: result.finalAnswer,
      provider: result.finalProvider,
      model: result.finalModel,
      usedFallback: false,
      metadata: {
        escalationChain: true,
        stepUsed: result.stepUsed,
        totalSteps: result.totalSteps,
        escalated: result.escalated,
        status: result.status,
        stepResults: result.stepResults,
        finalProvider: result.finalProvider,
        finalModel: result.finalModel,
      },
    });
  }

  private async storeErrorMessage(threadId: string, errorMsg: string): Promise<void> {
    await this.chatMessagesRepository.create({
      threadId,
      role: 'ASSISTANT',
      content: `Escalation chain failed: ${errorMsg}`,
      provider: 'escalation',
      model: 'chain',
      usedFallback: false,
      metadata: { escalationChain: true, error: true },
    });
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    if (!thread) {
      return undefined;
    }
    return {
      systemPrompt: thread.systemPrompt,
      temperature: thread.temperature,
      maxTokens: thread.maxTokens,
    };
  }
}
