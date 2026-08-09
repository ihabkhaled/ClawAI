import { HttpStatus, Injectable } from '@nestjs/common';
import { TokenLedgerContext } from '@claw/shared-types';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole, RoutingMode } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import {
  RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE,
  RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_MESSAGE,
  RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
  RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
  RUNTIME_V2_EMPTY_RESPONSE_CODE,
  RUNTIME_V2_EMPTY_RESPONSE_RETRIES,
  RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE,
  RUNTIME_V2_UNREPAIRABLE_REQUEST_MESSAGE,
} from '../constants/runtime-v2-failure.constants';
import {
  RUNTIME_V2_ACTIVE_TTL_SECONDS,
  RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES,
} from '../constants/runtime-v2-run.constants';
import { THREAD_CONTEXT_LIMIT } from '../../../common/constants';
import { RUNTIME_V2_TURN_EXECUTION_OPTIONS } from '../constants/runtime-v2-execution.constants';
import { RUNTIME_V2_CONTEXT_TOKEN_BUDGET } from '../constants/runtime-v2-transcript.constants';
import { type RuntimeResultDto, toolInvocationSchema } from '../dto/runtime-v2.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { MessageRoutedData } from '../types/execution.types';
import type { RuntimeV2BoundInput } from '../types/runtime-v2-store.types';
import type { RuntimeV2ModelTurn } from '../types/runtime-v2-turn.types';
import { createRuntimeV2Identity } from '../utilities/runtime-v2-identity.utility';
import {
  buildRuntimeV2ToolRequestRecord,
  buildRuntimeV2ToolResultRecord,
} from '../utilities/runtime-v2-transcript.utility';
import {
  excerpt,
  repairDiagnosis,
  runtimeV2TerminalReason,
} from '../utilities/runtime-v2-failure.utility';
import {
  buildRuntimeV2ModelInstruction,
  isCapabilityDenial,
  isUnfulfilledIntent,
  parseRuntimeV2ModelOutput,
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
  RUNTIME_V2_INTENT_CORRECTION_ATTEMPTS,
  RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION,
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
    try {
      await this.continueClaimedRun(binding, command, thread, binding.claimId);
    } catch (error: unknown) {
      // Any failure here used to escape as a bare HTTP error while the run
      // stayed active with no terminal event, so the client sat on a stream
      // that would never produce anything again — the agent simply stopped. A
      // provider returning empty content did exactly that. Ending the run with
      // the cause is what turns a hang into something the user can read.
      await this.store.terminalize({
        ...binding,
        claimId: binding.claimId,
        idempotencyKey: `${command.idempotencyKey}:continuation-failed`,
        status: 'failed',
        completedAt: new Date().toISOString(),
        reason: runtimeV2TerminalReason(error),
      });
      throw error;
    }
  }

  private async continueClaimedRun(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
    thread: { contextPackIds?: string[] | null },
    claimId: string,
  ): Promise<void> {
    // Close the current request in chronological order before assembling the
    // next model turn. When the result was written afterwards, every prompt
    // ended with an apparently unanswered request while its result appeared at
    // the start of the system prompt. Models then repeated the same reads.
    // The bounded transcript copy preserves causality; the full system copy
    // below preserves the complete result payload.
    await this.recordToolResult(binding, command);
    const runtimeContext = await this.buildContinuationContext(binding, command, thread);
    // Through the repair path, exactly like the first turn. Continuations used
    // to parse the reply inline, outside any try, so a model that asked for a
    // tool outside the admitted catalog — an ordinary mistake the repair turn
    // exists to correct — threw straight out of the loop. Fourteen tool steps
    // into a run that was going well, the user was shown "Internal server
    // error" and the work was lost.
    const first = await this.callWithRepair(binding, runtimeContext, RoutingMode.MANUAL_MODEL);
    // A continuation is exactly where "I'll now read the next file" appears,
    // and accepting it ended the task one step in while reporting success.
    const { response, output } = await this.turnWithDriftCorrection(
      binding,
      runtimeContext,
      RoutingMode.MANUAL_MODEL,
      first,
    );
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
      await this.admitOrEndExhaustedRun(binding, command, invocation, claimId);
      return;
    }
    await this.finishContinuation(binding, command, output.content, response, claimId);
  }

  /**
   * Recent history for a continuation, with the run's own question guaranteed.
   *
   * Each tool call now adds two transcript entries, so a task that makes a
   * dozen of them fills a 20-message window with nothing but its own tool
   * traffic and evicts the user's actual request. The model is then asked to
   * continue with no question in view and answers with nothing at all — the
   * provider returned empty content and the run died. Pinning the originating
   * message keeps the request in front of the model no matter how long the
   * tool trail gets.
   */
  private async continuationHistory(
    binding: RuntimeV2BoundInput,
  ): Promise<Parameters<ContextAssemblyManager['assemble']>[1]> {
    const recent = await this.messages.findRecentByThreadId(
      binding.threadId,
      RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES,
    );
    const ordered = [...recent].reverse();
    // The window that actually reaches the model is exactly THREAD_CONTEXT_LIMIT
    // long, because `assemble` slices to that many. The question of whether the
    // origin needs pinning has to be asked of THAT window and not of the wider
    // fetch: asking the wider one meant that from the moment the trail grew past
    // twenty entries — about the tenth tool step — the origin was still inside
    // the forty rows read from the database, so this said "no pin needed", and
    // the slice then cut it off anyway. The model was handed twenty of its own
    // tool records and no question at all.
    const window = ordered.slice(-THREAD_CONTEXT_LIMIT);
    if (window.some((message) => message.id === binding.messageId)) return window;
    const origin =
      ordered.find((message) => message.id === binding.messageId) ??
      (await this.messages.findById(binding.messageId));
    if (origin === null) return window;
    return [origin, ...window.slice(-(THREAD_CONTEXT_LIMIT - 1))];
  }

  /**
   * Assembles the context for a continuation turn.
   *
   * The recent thread carries a bounded, chronological transcript including
   * the current result. The injected result below is the FULL, unbounded copy
   * of that step so truncating its durable transcript record loses no evidence.
   */
  private async buildContinuationContext(
    binding: RuntimeV2BoundInput,
    command: RuntimeResultDto,
    thread: { contextPackIds?: string[] | null },
  ): Promise<Awaited<ReturnType<ContextAssemblyManager['assemble']>>> {
    const history = await this.continuationHistory(binding);
    const context = await this.contextAssembly.assemble(
      binding.ownerId,
      history,
      { maxTokens: RUNTIME_V2_CONTEXT_TOKEN_BUDGET },
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
    routingMode: string,
  ): Promise<RuntimeV2ModelTurn> {
    const turn = await this.correctDrift(
      binding,
      runtimeContext,
      routingMode,
      RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
    );
    if (turn.output.kind === 'final' && isCapabilityDenial(turn.output.content)) {
      throw new BusinessException(
        'The model denied a capability the admitted tool catalog grants.',
        'MODEL_CAPABILITY_DRIFT',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return turn;
  }

  /**
   * Asks once more when the model announced work and then stopped.
   *
   * A model that announces again after being told the loop exists has not
   * answered the request, and storing that as a completed answer is the silent
   * stop users report: the panel shows "I'll start by…" and the task is over.
   * Failing with the model's own words is honest and actionable.
   */
  private async correctUnfulfilledIntent(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    routingMode: string,
  ): Promise<RuntimeV2ModelTurn> {
    return this.correctDrift(
      binding,
      runtimeContext,
      routingMode,
      RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION,
    );
  }

  /**
   * One model turn, retried once when the provider returns nothing at all.
   *
   * An empty completion used to kill the run outright, discarding work already
   * done — a tool had executed and its result was in hand when the continuation
   * came back empty. Emptiness is usually transient, so the turn is asked for
   * again before the run is given up.
   */
  private async callRuntimeProvider(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    routingMode: string,
  ): Promise<Awaited<ReturnType<ChatExecutionManager['callProvider']>>> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.execution.callProvider(
          binding.provider,
          binding.model,
          runtimeContext,
          Date.now(),
          false,
          undefined,
          routingMode,
          RUNTIME_V2_TURN_EXECUTION_OPTIONS,
          TokenLedgerContext.CHAT,
        );
      } catch (error: unknown) {
        const empty =
          error instanceof BusinessException && error.code === RUNTIME_V2_EMPTY_RESPONSE_CODE;
        if (!empty || attempt >= RUNTIME_V2_EMPTY_RESPONSE_RETRIES) throw error;
      }
    }
  }

  private async correctDrift(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    routingMode: string,
    instruction: string,
  ): Promise<RuntimeV2ModelTurn> {
    const response = await this.callRuntimeProvider(
      binding,
      {
        ...runtimeContext,
        systemPrompt: `${runtimeContext.systemPrompt}\n\n${instruction}`,
      },
      routingMode,
    );
    return {
      response,
      output: parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions),
    };
  }

  /**
   * One model turn, corrected once if it drifted.
   *
   * A run that answers with an announcement — "I'll start by listing the
   * workspace" — did no work at all, so accepting it ends every multi-step task
   * after one step.
   */
  private async turnWithDriftCorrection(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    routingMode: string,
    turn: RuntimeV2ModelTurn,
  ): Promise<RuntimeV2ModelTurn> {
    if (turn.output.kind !== 'final' || binding.toolDefinitions.length === 0) {
      return turn;
    }
    if (isCapabilityDenial(turn.output.content)) {
      return this.correctCapabilityDrift(binding, runtimeContext, routingMode);
    }
    if (isUnfulfilledIntent(turn.output.content)) {
      return this.nudgeIntoActing(binding, runtimeContext, routingMode, turn);
    }
    return turn;
  }

  /**
   * Asks the model to act, and refuses to call a second announcement an answer.
   *
   * The nudge itself is best effort: a provider that returns nothing to the
   * extra call must not cost the user the answer the first call already gave.
   * But a model that announces again after being told the loop exists has done
   * no work, and storing that as a completed answer is the silent stop.
   */
  private async nudgeIntoActing(
    binding: RuntimeV2BoundInput,
    runtimeContext: Parameters<ChatExecutionManager['callProvider']>[2],
    routingMode: string,
    turn: RuntimeV2ModelTurn,
  ): Promise<RuntimeV2ModelTurn> {
    let latest = turn;
    let announcement = turn.output.kind === 'final' ? turn.output.content : '';
    for (let attempt = 0; attempt < RUNTIME_V2_INTENT_CORRECTION_ATTEMPTS; attempt += 1) {
      let corrected: RuntimeV2ModelTurn;
      try {
        corrected = await this.correctUnfulfilledIntent(binding, runtimeContext, routingMode);
      } catch {
        // Best effort: a provider that returns nothing to the extra call must
        // not cost the user the answer the first call already gave.
        return latest;
      }
      if (corrected.output.kind !== 'final' || !isUnfulfilledIntent(corrected.output.content)) {
        return corrected;
      }
      latest = corrected;
      announcement = corrected.output.content;
    }
    // Asked repeatedly and narrated every time. Storing that as a completed
    // answer is the silent stop this exists to prevent.
    throw new BusinessException(
      `${RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_MESSAGE} ${excerpt(announcement)}`,
      RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
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
      // The first turn carries the entire admitted tool catalog in its system
      // prompt — around 17 KB on its own. On the default 4096-token budget the
      // assembler spliced the middle out of that catalog, the model received a
      // truncated instruction it could not act on, and the provider answered
      // with nothing: CLOUD_PROVIDER_EMPTY_RESPONSE on the very first call.
      // Continuations were given a runtime-sized budget; the turn that needs it
      // most was not.
      { maxTokens: RUNTIME_V2_CONTEXT_TOKEN_BUDGET },
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
    routingMode: string,
  ): Promise<{
    response: Awaited<ReturnType<ChatExecutionManager['callProvider']>>;
    output: ReturnType<typeof parseRuntimeV2ModelOutput>;
  }> {
    const response = await this.callRuntimeProvider(binding, runtimeContext, routingMode);
    try {
      return {
        response,
        output: parseRuntimeV2ModelOutput(response.content, binding.toolDefinitions),
      };
    } catch (rejection: unknown) {
      // The parser's message names the offending key or the failing rule. It
      // used to be discarded here, so the repair turn could only say "invalid"
      // — and a model that believes its request is correct repeats it. Quoting
      // the real reason is what turns the second attempt into a correction.
      const diagnosis = repairDiagnosis(rejection);
      const repaired = await this.execution.callProvider(
        binding.provider,
        binding.model,
        {
          ...runtimeContext,
          systemPrompt: [runtimeContext.systemPrompt, RUNTIME_V2_REPAIR_INSTRUCTION, diagnosis]
            .filter((value): value is string => value !== null && value.length > 0)
            .join('\n\n'),
        },
        Date.now(),
        false,
        undefined,
        routingMode,
        RUNTIME_V2_TURN_EXECUTION_OPTIONS,
        TokenLedgerContext.CHAT,
      );
      try {
        return {
          response: repaired,
          output: parseRuntimeV2ModelOutput(repaired.content, binding.toolDefinitions),
        };
      } catch (secondRejection: unknown) {
        // The repair turn was the second chance and it did not take it. That is
        // a run that cannot continue, but it is still a model failing to follow
        // a protocol — not a fault in this service. Raising the raw parse error
        // here reached the exception filter and the user was shown "Internal
        // server error" with nothing to act on.
        //
        // The reason is carried too: a quoted request that is cut off before
        // the offending key leaves whoever reads this unable to tell what was
        // actually wrong with it.
        // The diagnosis comes before the quote. The whole message is truncated
        // to a bounded length, and the quoted request is the long part — put
        // the reason last and it is the first thing lost, which is exactly the
        // information needed to act.
        throw new BusinessException(
          [
            RUNTIME_V2_UNREPAIRABLE_REQUEST_MESSAGE,
            repairDiagnosis(secondRejection),
            excerpt(repaired.content),
          ]
            .filter((value) => value.length > 0)
            .join(' '),
          RUNTIME_V2_UNREPAIRABLE_REQUEST_CODE,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
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
      const { response, output } = await this.turnWithDriftCorrection(
        binding,
        runtimeContext,
        payload.routingMode,
        await this.callWithRepair(binding, runtimeContext, payload.routingMode),
      );
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
