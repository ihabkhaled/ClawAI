import { HttpStatus, Injectable } from '@nestjs/common';
import { TokenLedgerContext } from '@claw/shared-types';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole, RoutingMode } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import { type RuntimeResultDto, toolInvocationSchema } from '../dto/runtime-v2.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { MessageRoutedData } from '../types/execution.types';
import type { RuntimeV2BoundInput } from '../types/runtime-v2-store.types';
import { createRuntimeV2Identity } from '../utilities/runtime-v2-identity.utility';
import { runtimeV2TerminalReason } from '../utilities/runtime-v2-failure.utility';
import {
  buildRuntimeV2ModelInstruction,
  isCapabilityDenial,
  parseRuntimeV2ModelOutput,
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
  RUNTIME_V2_REPAIR_INSTRUCTION,
} from '../utilities/runtime-v2-model-output.utility';
import { ChatExecutionManager } from './chat-execution.manager';
import { ContextAssemblyManager } from './context-assembly.manager';

@Injectable()
export class RuntimeV2LoopManager {
  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly store: RuntimeV2Store,
    private readonly contextAssembly: ContextAssemblyManager,
    private readonly execution: ChatExecutionManager,
  ) {}

  async tryHandleRouted(payload: MessageRoutedData): Promise<boolean> {
    let binding: RuntimeV2BoundInput;
    try {
      binding = await this.store.resolveMessageBinding({
        messageId: payload.messageId,
        threadId: payload.threadId,
        provider: payload.selectedProvider,
        model: payload.selectedModel,
        ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
      });
    } catch (error: unknown) {
      if (error instanceof BusinessException && error.code === 'RUNTIME_RUN_NOT_FOUND')
        return false;
      throw error;
    }

    await this.executeClaimedRun(binding, payload);
    return true;
  }

  async continueAfterResult(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
  ): Promise<void> {
    if (binding.claimId === undefined) {
      throw new BusinessException(
        'Runtime continuation has no active claim',
        'RUNTIME_CLAIM_MISSING',
        HttpStatus.CONFLICT,
      );
    }
    const thread = await this.threads.findById(binding.threadId);
    if (thread?.userId !== binding.ownerId) {
      throw new EntityNotFoundException('ChatThread', binding.threadId);
    }
    const recent = await this.messages.findRecentByThreadId(binding.threadId, 20);
    const context = await this.contextAssembly.assemble(
      binding.ownerId,
      [...recent].reverse(),
      undefined,
      thread.contextPackIds ?? undefined,
      undefined,
      undefined,
      RoutingMode.MANUAL_MODEL,
    );
    const resultDocument = JSON.stringify({
      status: command.result.status,
      structured: command.result.structured ?? null,
      modelText: command.result.modelText ?? null,
      error: command.result.error ?? null,
    });
    const runtimeContext = {
      ...context,
      systemPrompt: [
        context.systemPrompt,
        buildRuntimeV2ModelInstruction(binding.toolDefinitions),
        `The trusted executor returned this redacted tool result: ${resultDocument}`,
      ]
        .filter((value): value is string => value !== null)
        .join('\n\n'),
    };
    const response = await this.execution.callProvider(
      binding.provider,
      binding.model,
      runtimeContext,
      Date.now(),
      false,
      undefined,
      RoutingMode.MANUAL_MODEL,
      undefined,
      TokenLedgerContext.CHAT,
    );
    const output = parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions);
    if (output.kind === 'tool') {
      const invocation = toolInvocationSchema.parse({
        schemaVersion: '2.0',
        invocationId: createRuntimeV2Identity('invocation'),
        runId: binding.runId,
        turnId: command.result.continuation.nextTurnId,
        toolName: output.toolName,
        toolVersion: output.toolVersion,
        operation: output.operation,
        arguments: output.arguments,
        targetId: output.targetId,
        epochs: binding.epochs,
        idempotencyKey: createRuntimeV2Identity('invocation-key'),
        requestedAt: new Date().toISOString(),
      });
      await this.store.admitInvocation({ ...binding, invocation });
      return;
    }
    await this.messages.create({
      threadId: binding.threadId,
      role: MessageRole.ASSISTANT,
      content: output.content,
      provider: response.provider,
      model: response.model,
      ...(response.inputTokens === undefined ? {} : { inputTokens: response.inputTokens }),
      ...(response.outputTokens === undefined ? {} : { outputTokens: response.outputTokens }),
      latencyMs: response.latencyMs,
      usedFallback: false,
      metadata: { runtimeV2: { runId: binding.runId, generation: binding.generation } },
    });
    await this.store.terminalize({
      ...binding,
      claimId: binding.claimId,
      idempotencyKey: `${command.idempotencyKey}:continuation-terminal`,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  // Runtime 2.1 §7.4 drift correction. A capability denial is only false when the admitted catalog
  // actually granted that authority, and only before any tool has run in this turn. Correct exactly
  // once; a second denial fails the run rather than persisting a lie as a completed answer.
  private async correctCapabilityDrift(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    payload: MessageRoutedData,
  ): Promise<{
    response: Awaited<ReturnType<ChatExecutionManager['callProvider']>>;
    output: ReturnType<typeof parseRuntimeV2ModelOutput>;
  }> {
    const response = await this.execution.callProvider(
      binding.provider,
      binding.model,
      {
        ...runtimeContext,
        systemPrompt: `${runtimeContext.systemPrompt}\n\n${RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION}`,
      },
      Date.now(),
      false,
      undefined,
      payload.routingMode,
      undefined,
      TokenLedgerContext.CHAT,
    );
    const output = parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions);
    if (output.kind === 'final' && isCapabilityDenial(output.content)) {
      throw new BusinessException(
        'The model denied a capability the admitted tool catalog grants.',
        'MODEL_CAPABILITY_DRIFT',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { response, output };
  }

  private async executeClaimedRun(
    binding: RuntimeV2BoundInput,
    payload: MessageRoutedData,
  ): Promise<void> {
    const thread = await this.threads.findById(binding.threadId);
    if (thread?.userId !== binding.ownerId) {
      throw new EntityNotFoundException('ChatThread', binding.threadId);
    }
    const deliveryId = createRuntimeV2Identity('delivery');
    const claim = await this.store.claimRouted({
      ...binding,
      deliveryId,
      messageId: payload.messageId,
      provider: payload.selectedProvider,
      model: payload.selectedModel,
    });
    if (!claim.claimed) return;

    await this.store.markProviderDispatched({
      ...binding,
      claimId: claim.claimId,
      idempotencyKey: createRuntimeV2Identity('dispatch'),
      dispatchedAt: new Date().toISOString(),
    });

    try {
      const recent = await this.messages.findRecentByThreadId(binding.threadId, 20);
      const context = await this.contextAssembly.assemble(
        binding.ownerId,
        [...recent].reverse(),
        undefined,
        thread.contextPackIds ?? undefined,
        undefined,
        undefined,
        payload.routingMode as RoutingMode,
      );
      const runtimeContext = {
        ...context,
        systemPrompt: [
          context.systemPrompt,
          buildRuntimeV2ModelInstruction(binding.toolDefinitions),
        ]
          .filter((value): value is string => value !== null)
          .join('\n\n'),
      };
      let response = await this.execution.callProvider(
        binding.provider,
        binding.model,
        runtimeContext,
        Date.now(),
        false,
        undefined,
        payload.routingMode,
        undefined,
        TokenLedgerContext.CHAT,
      );
      let output;
      try {
        output = parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions);
      } catch {
        response = await this.execution.callProvider(
          binding.provider,
          binding.model,
          {
            ...runtimeContext,
            systemPrompt: `${runtimeContext.systemPrompt}\n\n${RUNTIME_V2_REPAIR_INSTRUCTION}`,
          },
          Date.now(),
          false,
          undefined,
          payload.routingMode,
          undefined,
          TokenLedgerContext.CHAT,
        );
        output = parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions);
      }
      if (
        output.kind === 'final' &&
        binding.toolDefinitions.length > 0 &&
        isCapabilityDenial(output.content)
      ) {
        const corrected = await this.correctCapabilityDrift(binding, runtimeContext, payload);
        response = corrected.response;
        output = corrected.output;
      }
      if (output.kind === 'tool') {
        const invocation = toolInvocationSchema.parse({
          schemaVersion: '2.0',
          invocationId: createRuntimeV2Identity('invocation'),
          runId: binding.runId,
          turnId: createRuntimeV2Identity('turn'),
          toolName: output.toolName,
          toolVersion: output.toolVersion,
          operation: output.operation,
          arguments: output.arguments,
          targetId: output.targetId,
          epochs: binding.epochs,
          idempotencyKey: createRuntimeV2Identity('invocation-key'),
          requestedAt: new Date().toISOString(),
        });
        await this.store.admitInvocation({
          ...binding,
          invocation,
        });
        return;
      }
      await this.messages.create({
        threadId: binding.threadId,
        role: MessageRole.ASSISTANT,
        content: output.content,
        provider: response.provider,
        model: response.model,
        ...(response.inputTokens === undefined ? {} : { inputTokens: response.inputTokens }),
        ...(response.outputTokens === undefined ? {} : { outputTokens: response.outputTokens }),
        latencyMs: response.latencyMs,
        usedFallback: false,
        metadata: { runtimeV2: { runId: binding.runId, generation: binding.generation } },
      });
      await this.store.terminalize({
        ...binding,
        claimId: claim.claimId,
        idempotencyKey: createRuntimeV2Identity('terminal'),
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      await this.store.terminalize({
        ...binding,
        claimId: claim.claimId,
        idempotencyKey: createRuntimeV2Identity('terminal'),
        status: 'failed',
        completedAt: new Date().toISOString(),
        // Without this the client received `run.failed` with an empty payload:
        // it could show that the run died but never why, which made every live
        // failure a log-diving exercise.
        reason: runtimeV2TerminalReason(error),
      });
      throw error;
    }
  }
}
