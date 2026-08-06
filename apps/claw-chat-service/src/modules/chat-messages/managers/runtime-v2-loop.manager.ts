import { HttpStatus, Injectable } from '@nestjs/common';
import { TokenLedgerContext } from '@claw/shared-types';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole, RoutingMode } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import {
  RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
  RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
} from '../constants/runtime-v2-failure.constants';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import { type RuntimeResultDto, toolInvocationSchema } from '../dto/runtime-v2.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { MessageRoutedData } from '../types/execution.types';
import type { RuntimeV2BoundInput } from '../types/runtime-v2-store.types';
import { createRuntimeV2Identity } from '../utilities/runtime-v2-identity.utility';
import {
  buildRuntimeV2ToolRequestRecord,
  buildRuntimeV2ToolResultRecord,
} from '../utilities/runtime-v2-transcript.utility';
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
    // Recorded BEFORE the history is read so this turn sees the full
    // transcript — its own earlier requests, their results, and this one — in
    // one place, instead of a single result injected out of context.
    await this.recordToolResult(binding, command);
    const runtimeContext = await this.buildContinuationContext(binding, command, thread);
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
      await this.recordToolRequest(binding, invocation);
      await this.admitOrEndExhaustedRun(binding, command, invocation, binding.claimId);
      return;
    }
    await this.finishContinuation(binding, command, output.content, response, binding.claimId);
  }

  /**
   * Assembles the context for a continuation turn.
   *
   * The recent thread now carries the agent's own transcript, so the injected
   * result below is the FULL, unbounded copy of the step just completed while
   * the transcript keeps a bounded trail of every earlier one.
   */
  private async buildContinuationContext(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
    thread: { contextPackIds?: string[] | null },
  ): Promise<Awaited<ReturnType<ContextAssemblyManager['assemble']>>> {
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
    return {
      ...context,
      systemPrompt: [
        context.systemPrompt,
        buildRuntimeV2ModelInstruction(binding.toolDefinitions),
        `The trusted executor returned this redacted tool result: ${resultDocument}`,
      ]
        .filter((value): value is string => value !== null)
        .join('\n\n'),
    };
  }

  /** Stores the answer, publishes it to the journal, then ends the run. */
  private async finishContinuation(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
    content: string,
    response: Awaited<ReturnType<ChatExecutionManager['callProvider']>>,
    claimId: string,
  ): Promise<void> {
    await this.messages.create({
      threadId: binding.threadId,
      role: MessageRole.ASSISTANT,
      content,
      provider: response.provider,
      model: response.model,
      ...(response.inputTokens === undefined ? {} : { inputTokens: response.inputTokens }),
      ...(response.outputTokens === undefined ? {} : { outputTokens: response.outputTokens }),
      latencyMs: response.latencyMs,
      usedFallback: false,
      metadata: { runtimeV2: { runId: binding.runId, generation: binding.generation } },
    });
    // The continuation path is the one a coding agent actually finishes on:
    // the model called tools, got results, and is now answering. Its answer
    // needs publishing to the journal BEFORE terminalizing, so a client reading
    // by cursor receives the text ahead of `run.completed`.
    await this.store.appendModelOutput({
      ...binding,
      claimId,
      idempotencyKey: `${command.idempotencyKey}:continuation-output`,
      turnId: command.result.continuation.nextTurnId ?? createRuntimeV2Identity('turn'),
      text: content,
    });
    await this.store.terminalize({
      ...binding,
      claimId,
      idempotencyKey: `${command.idempotencyKey}:continuation-terminal`,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Writes the agent's own actions into the thread so it can see them again.
   *
   * A continuation turn reads the recent thread and nothing else, and neither
   * half of a tool exchange was ever stored — so the model saw the user's
   * prompt, one injected result, and no trace of what it had already done. It
   * re-planned from scratch every turn and reissued the same calls: one run had
   * its answer after two calls and then repeated that pair seven more times
   * until the budget died, answering nothing.
   *
   * Both halves are stored under the TOOL role. `mapRole` sends TOOL to the
   * provider as a system turn, so the model reads the trail in order, while the
   * UI labels it "Tool" rather than letting raw JSON pose as an assistant
   * answer.
   */
  private async recordToolRequest(
    binding: RuntimeV2BoundInput,
    invocation: ReturnType<typeof toolInvocationSchema.parse>,
  ): Promise<void> {
    await this.messages.create({
      threadId: binding.threadId,
      role: MessageRole.TOOL,
      content: buildRuntimeV2ToolRequestRecord(invocation),
      provider: binding.provider,
      model: binding.model,
      usedFallback: false,
      metadata: {
        runtimeV2: {
          runId: binding.runId,
          generation: binding.generation,
          invocationId: invocation.invocationId,
          kind: 'tool-request',
        },
      },
    });
  }

  private async recordToolResult(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
  ): Promise<void> {
    await this.messages.create({
      threadId: binding.threadId,
      role: MessageRole.TOOL,
      content: buildRuntimeV2ToolResultRecord(command.result),
      provider: binding.provider,
      model: binding.model,
      usedFallback: false,
      metadata: {
        runtimeV2: {
          runId: binding.runId,
          generation: binding.generation,
          invocationId: command.result.invocationId,
          kind: 'tool-result',
        },
      },
    });
  }

  /**
   * Admits the next tool call, or ends the run when its budget is spent.
   *
   * Once admission reports an exhausted budget, no further invocation can ever
   * be admitted for this run. Letting that denial escape as a bare 409 left the
   * run `active` with no terminal event, so a client sat on a stream that would
   * never produce another thing: the agent stopped mid-task with no answer and
   * no error. In a 100-run sweep this was every remaining failure — 10 of 12,
   * all of them multi-step tasks that spent their tool calls before answering.
   *
   * Terminalizing turns the dead end into a terminal event the client can
   * render, and the reason says the budget ran out rather than leaving the user
   * to guess. Any other denial is still a real fault and is re-thrown.
   */
  private async admitOrEndExhaustedRun(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
    invocation: ReturnType<typeof toolInvocationSchema.parse>,
    claimId: string,
  ): Promise<void> {
    try {
      await this.store.admitInvocation({ ...binding, invocation });
    } catch (error: unknown) {
      if (
        !(error instanceof BusinessException) ||
        error.code !== RUNTIME_V2_BUDGET_EXHAUSTED_CODE
      ) {
        throw error;
      }
      await this.store.terminalize({
        ...binding,
        claimId,
        idempotencyKey: `${command.idempotencyKey}:budget-terminal`,
        status: 'failed',
        completedAt: new Date().toISOString(),
        reason: {
          code: RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
          message: RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
        },
      });
    }
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

  /** Context for the run's first turn, before any tool has been called. */
  private async buildFirstTurnContext(
    binding: RuntimeV2BoundInput,
    payload: MessageRoutedData,
    thread: { contextPackIds?: string[] | null },
  ): Promise<Awaited<ReturnType<ContextAssemblyManager['assemble']>>> {
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
    return {
      ...context,
      systemPrompt: [context.systemPrompt, buildRuntimeV2ModelInstruction(binding.toolDefinitions)]
        .filter((value): value is string => value !== null)
        .join('\n\n'),
    };
  }

  /**
   * Calls the provider, and on a malformed tool request asks once more with the
   * repair instruction appended. A second failure is a real fault and raises.
   */
  private async callWithRepair(
    binding: RuntimeV2BoundInput,
    runtimeContext: Awaited<ReturnType<ContextAssemblyManager['assemble']>>,
    payload: MessageRoutedData,
  ): Promise<{
    response: Awaited<ReturnType<ChatExecutionManager['callProvider']>>;
    output: ReturnType<typeof parseRuntimeV2ModelOutput>;
  }> {
    const response = await this.execution.callProvider(
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
    try {
      return {
        response,
        output: parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions),
      };
    } catch {
      const repaired = await this.execution.callProvider(
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
      return {
        response: repaired,
        output: parseRuntimeV2ModelOutput(repaired.content, binding.toolDefinitions),
      };
    }
  }

  /**
   * Stores the answer, publishes it to the journal, then ends the run.
   *
   * The journal write comes BEFORE terminalizing so a client reading by cursor
   * receives the text ahead of `run.completed` and never has to reconcile a
   * finished run that never said anything. Persisting the message alone left
   * the answer visible only to whoever queried the database.
   */
  private async finishFirstTurn(
    binding: RuntimeV2BoundInput,
    content: string,
    response: Awaited<ReturnType<ChatExecutionManager['callProvider']>>,
    claimId: string,
  ): Promise<void> {
    await this.messages.create({
      threadId: binding.threadId,
      role: MessageRole.ASSISTANT,
      content,
      provider: response.provider,
      model: response.model,
      ...(response.inputTokens === undefined ? {} : { inputTokens: response.inputTokens }),
      ...(response.outputTokens === undefined ? {} : { outputTokens: response.outputTokens }),
      latencyMs: response.latencyMs,
      usedFallback: false,
      metadata: { runtimeV2: { runId: binding.runId, generation: binding.generation } },
    });
    await this.store.appendModelOutput({
      ...binding,
      claimId,
      idempotencyKey: createRuntimeV2Identity('model-output'),
      turnId: createRuntimeV2Identity('turn'),
      text: content,
    });
    await this.store.terminalize({
      ...binding,
      claimId,
      idempotencyKey: createRuntimeV2Identity('terminal'),
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
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
      const runtimeContext = await this.buildFirstTurnContext(binding, payload, thread);
      let { response, output } = await this.callWithRepair(binding, runtimeContext, payload);
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
        await this.recordToolRequest(binding, invocation);
        await this.store.admitInvocation({
          ...binding,
          invocation,
        });
        return;
      }
      await this.finishFirstTurn(binding, output.content, response, claim.claimId);
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
