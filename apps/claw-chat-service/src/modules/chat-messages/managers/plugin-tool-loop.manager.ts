import { Injectable, Logger, Optional } from '@nestjs/common';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { ToolChoiceMode } from '../../../common/enums/tool-choice-mode.enum';
import { PluginConsentPort } from '../clients/plugin-consent.port';
import { PluginInvokePort } from '../clients/plugin-invoke.port';
import {
  PLUGIN_CONSENT_DECLINED_TEXT,
  PLUGIN_CONSENT_DENIED_CODE,
  PLUGIN_CONSENT_DENIED_TEXT,
  PLUGIN_CONSENT_EXPIRED_CODE,
  PLUGIN_CONSENT_EXPIRED_TEXT,
  PLUGIN_CONSENT_GRACE_MS,
  PLUGIN_CONSENT_MAX_WAIT_MS,
  PLUGIN_CONSENT_MAX_WAITS,
  PLUGIN_CONSENT_UNAVAILABLE_CODE,
  PLUGIN_CONSENT_WAIT_SLICE_MS,
  PLUGIN_LOOP_PLAIN_OPTIONS,
  PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION,
} from '../constants/plugin-tools.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import { PluginConsentState } from '../enums/plugin-consent-state.enum';
import { PluginInvokeStatus } from '../enums/plugin-invoke-status.enum';
import { PluginNoticeCode } from '../enums/plugin-notice-code.enum';
import type { AssembledContext } from '../types/context.types';
import type { ConsentResume, PluginConsentCard } from '../types/plugin-consent.types';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { LlmResponse } from '../types/execution.types';
import type {
  PluginCallRecord,
  PluginExecuteCallsInput,
  PluginInvokeResult,
  PluginLoopLimits,
  PluginLoopRoundState,
  PluginNotice,
  PluginRef,
  PluginResolveResult,
  PluginToolCatalog,
  PluginToolLoopArgs,
  ResolvedPluginTool,
} from '../types/plugin-tools.types';
import type { NormalizedToolCall } from '../types/provider-tool.types';
import type { ToolTurn } from '../types/tool-turn.types';
import { ChatStreamService } from '../services/chat-stream.service';
import { withoutPluginRefs } from '../utilities/plugin-refs.utility';
import { fencePluginResult, pluginResultExcerpt } from '../utilities/plugin-result-fence.utility';
import { toolsAllowedByRefs, toToolCatalog } from '../utilities/plugin-tool-definition.utility';

/**
 * Runs a message that @mentioned plugins: offers ONLY the mentioned plugins' tools to
 * the model as native tools, executes the calls through plugin-service, feeds each
 * result back as untrusted data and repeats, up to `loop.maxRounds` tool rounds and
 * `loop.maxCallsPerTurn` calls, then asks for the final answer with tools switched off.
 *
 * It does not call a model itself. `callModel` is one paid chokepoint call (so every
 * round is metered, held and ledgered by `callProvider` exactly like any other), and
 * the tool calls cost nothing here: plugin-service counts them as `PLUGIN_CALLS`. A
 * plugin-service outage never fails the message; it answers without the tools and says
 * so in `pluginNotices`.
 */
@Injectable()
export class PluginToolLoopManager {
  private readonly logger = new Logger(PluginToolLoopManager.name);

  constructor(
    private readonly plugins: PluginInvokePort,
    @Optional() private readonly consent?: PluginConsentPort,
    @Optional() private readonly stream?: ChatStreamService,
  ) {}

  async run(args: PluginToolLoopArgs): Promise<LlmResponse> {
    const refs = args.context.pluginRefs ?? [];
    const base = withoutPluginRefs(args.context);
    const options = args.executionOptions ?? PLUGIN_LOOP_PLAIN_OPTIONS;

    const resolved = await this.resolve(args, refs);
    if (resolved === null) {
      return this.plainAnswer(args, base, options, [
        { code: PluginNoticeCode.SERVICE_UNAVAILABLE },
      ]);
    }
    const catalog = toToolCatalog(toolsAllowedByRefs(resolved.tools, refs));
    if (catalog.accepted.length === 0) {
      return this.plainAnswer(args, base, options, [
        ...resolved.notices,
        ...(resolved.notices.length === 0 ? [{ code: PluginNoticeCode.NO_TOOLS }] : []),
      ]);
    }
    const state: PluginLoopRoundState = {
      context: this.withToolInstructions(base, resolved.systemBlock),
      records: [],
      notices: [...resolved.notices],
      callsMade: 0,
      tainted: false,
    };
    return this.toolRounds(args, state, options, catalog, resolved.limits);
  }

  private async resolve(
    args: PluginToolLoopArgs,
    refs: readonly PluginRef[],
  ): Promise<PluginResolveResult | null> {
    try {
      return await this.plugins.resolve({
        userId: args.context.userId,
        surface: args.context.platformSurface ?? ChatSurface.CHAT,
        refs,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `resolve: plugin-service unavailable, answering without tools — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private async toolRounds(
    args: PluginToolLoopArgs,
    state: PluginLoopRoundState,
    options: ExecutionOptions,
    catalog: PluginToolCatalog,
    limits: PluginLoopLimits,
  ): Promise<LlmResponse> {
    const { definitions } = catalog;
    const byName = new Map(catalog.accepted.map((tool) => [tool.nativeName, tool]));
    const { maxRounds, maxCallsPerTurn } = limits;

    for (let round = 1; round <= maxRounds; round += 1) {
      const response = await args.callModel({
        round: round - 1,
        context: state.context,
        options: this.withCatalog(options, definitions, ToolChoiceMode.AUTO),
      });
      const calls = response.toolCalls ?? [];
      if (calls.length === 0) {
        return this.finish(response, state);
      }
      const turn = await this.executeCalls({ args, state, round, calls, byName, maxCallsPerTurn });
      state.context = {
        ...state.context,
        toolTurns: [
          ...(state.context.toolTurns ?? []),
          { ...turn, assistantText: response.content },
        ],
      };
    }

    // Still asking for tools after the cap: stop offering them and ask for the answer.
    this.noteOnce(state, PluginNoticeCode.LIMIT_REACHED);
    const finalResponse = await args.callModel({
      round: maxRounds,
      context: state.context,
      options: this.withCatalog(options, definitions, ToolChoiceMode.NONE),
    });
    return this.finish(finalResponse, state);
  }

  private async executeCalls(
    input: PluginExecuteCallsInput,
  ): Promise<Omit<ToolTurn, 'assistantText'>> {
    const { args, state, round, calls, byName, maxCallsPerTurn } = input;
    const results: ToolTurn['results'][number][] = [];
    for (const call of calls) {
      const tool = byName.get(call.nativeName);
      let result: PluginInvokeResult;
      if (tool === undefined) {
        result = this.refusal('PLUGIN_TOOL_NOT_OFFERED');
      } else if (state.callsMade >= maxCallsPerTurn) {
        result = this.refusal('PLUGIN_CALL_LIMIT');
        this.noteOnce(state, PluginNoticeCode.LIMIT_REACHED);
      } else {
        state.callsMade += 1;
        result = await this.invoke(args, tool, { call, tainted: state.tainted });
        if (this.needsCard(result)) {
          result = await this.askUser(args, tool, call, result, state.tainted);
        }
        // From here on an untrusted result is in the model context: a later non-READ
        // call this turn needs consent every time (the taint rule).
        state.tainted = true;
      }
      if (result.status === PluginInvokeStatus.CONSENT_REQUIRED) {
        this.noteOnce(state, PluginNoticeCode.CONSENT_NOT_AVAILABLE);
      }
      state.records.push(this.toRecord(call, tool, result, round));
      results.push({
        callId: call.callId,
        content: fencePluginResult({
          pluginSlug: tool?.pluginSlug ?? 'unknown',
          toolName: tool?.toolName ?? call.toolName,
          content: this.modelText(result),
        }),
        isError: result.status !== PluginInvokeStatus.OK,
      });
    }
    return {
      calls: calls.map((call) => ({
        callId: call.callId,
        nativeName: call.nativeName,
        arguments: call.arguments,
      })),
      results,
    };
  }

  private async invoke(
    args: PluginToolLoopArgs,
    tool: ResolvedPluginTool,
    input: { call: NormalizedToolCall; tainted: boolean; resume?: ConsentResume },
  ): Promise<PluginInvokeResult> {
    const { call, tainted, resume } = input;
    try {
      return await this.plugins.invoke({
        userId: args.context.userId,
        installId: tool.installId,
        toolName: tool.toolName,
        args: call.arguments,
        conversationId: args.threadId ?? '',
        messageId: args.messageId,
        surface: args.context.platformSurface ?? ChatSurface.CHAT,
        tainted,
        ...(resume === undefined
          ? {}
          : { callId: resume.callId, consentRequestId: resume.consentRequestId }),
      });
    } catch (error: unknown) {
      this.logger.warn(
        `invoke: ${tool.nativeName} failed — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.refusal('PLUGIN_SERVICE_UNAVAILABLE');
    }
  }

  /** True when plugin-service raised a consent request this loop can park the turn on. */
  private needsCard(result: PluginInvokeResult): boolean {
    return (
      result.status === PluginInvokeStatus.CONSENT_REQUIRED &&
      result.consent !== undefined &&
      result.callId !== undefined &&
      this.consent !== undefined
    );
  }

  /**
   * The turn pauses here: the card is announced on the stream, the loop waits (bounded) for the
   * user's answer, and only a yes resumes the SAME call (same call id, the approved request id).
   * Deny, a timeout, or any trouble reaching plugin-service ends in a blocked result the model
   * is told about plainly. The call never runs without plugin-service spending the approval.
   */
  private async askUser(
    args: PluginToolLoopArgs,
    tool: ResolvedPluginTool,
    call: NormalizedToolCall,
    asked: PluginInvokeResult,
    tainted: boolean,
  ): Promise<PluginInvokeResult> {
    const card = asked.consent;
    const callId = asked.callId;
    if (card === undefined || callId === undefined) return asked;
    this.announce(args, tool, card, undefined);
    const answer = await this.awaitAnswer(args.context.userId, card);
    this.announce(args, tool, card, answer);
    if (answer === PluginConsentState.APPROVED) {
      return this.invoke(args, tool, {
        call,
        tainted,
        resume: { callId, consentRequestId: card.requestId },
      });
    }
    return this.blocked(this.blockCode(answer));
  }

  /** Polls plugin-service in slices until the user answers or the request's own deadline passes. */
  private async awaitAnswer(userId: string, card: PluginConsentCard): Promise<PluginConsentState> {
    const port = this.consent;
    if (port === undefined) return PluginConsentState.EXPIRED;
    const deadline = Math.min(
      Date.parse(card.expiresAt) + PLUGIN_CONSENT_GRACE_MS,
      Date.now() + PLUGIN_CONSENT_MAX_WAIT_MS,
    );
    for (let attempt = 0; attempt < PLUGIN_CONSENT_MAX_WAITS; attempt += 1) {
      const remaining = deadline - Date.now();
      if (!(remaining > 0)) return PluginConsentState.EXPIRED;
      try {
        const state = await port.wait({
          userId,
          requestId: card.requestId,
          waitMs: Math.min(remaining, PLUGIN_CONSENT_WAIT_SLICE_MS),
        });
        if (state !== PluginConsentState.PENDING) return state;
      } catch (error: unknown) {
        this.logger.warn(
          `consent wait failed, denying the call — ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        return PluginConsentState.CONSUMED;
      }
    }
    return PluginConsentState.EXPIRED;
  }

  private announce(
    args: PluginToolLoopArgs,
    tool: ResolvedPluginTool,
    card: PluginConsentCard,
    outcome: PluginConsentState | undefined,
  ): void {
    const threadId = args.threadId;
    if (this.stream === undefined || threadId === undefined || threadId === '') return;
    const payload = {
      requestId: card.requestId,
      pluginSlug: tool.pluginSlug,
      toolName: tool.toolName,
      toolTitle: tool.title,
      riskLevel: tool.riskLevel,
      argsPreview: card.argsPreview,
      expiresAt: card.expiresAt,
      options: card.options,
      messageId: args.messageId,
    };
    if (outcome === undefined) {
      this.stream.emitPluginConsentRequested(threadId, payload);
    } else {
      this.stream.emitPluginConsentResolved(threadId, { ...payload, outcome });
    }
  }

  /** The code a blocked result carries for an answer that did not resume the call. */
  private blockCode(answer: PluginConsentState): string {
    switch (answer) {
      case PluginConsentState.DENIED: {
        return PLUGIN_CONSENT_DENIED_CODE;
      }
      case PluginConsentState.EXPIRED: {
        return PLUGIN_CONSENT_EXPIRED_CODE;
      }
      default: {
        return PLUGIN_CONSENT_UNAVAILABLE_CODE;
      }
    }
  }

  private blocked(errorCode: string): PluginInvokeResult {
    return { status: PluginInvokeStatus.BLOCKED, truncated: false, durationMs: 0, errorCode };
  }

  private refusal(errorCode: string): PluginInvokeResult {
    return { status: PluginInvokeStatus.ERROR, truncated: false, durationMs: 0, errorCode };
  }

  private modelText(result: PluginInvokeResult): string {
    switch (result.status) {
      case PluginInvokeStatus.OK: {
        return result.content ?? '';
      }
      case PluginInvokeStatus.CONSENT_REQUIRED: {
        return PLUGIN_CONSENT_DECLINED_TEXT;
      }
      default: {
        if (result.errorCode === PLUGIN_CONSENT_DENIED_CODE) return PLUGIN_CONSENT_DENIED_TEXT;
        return result.errorCode === PLUGIN_CONSENT_EXPIRED_CODE ||
          result.errorCode === PLUGIN_CONSENT_UNAVAILABLE_CODE
          ? PLUGIN_CONSENT_EXPIRED_TEXT
          : `The tool did not run (${result.errorCode ?? result.status}). Do not retry it; continue without it.`;
      }
    }
  }

  private toRecord(
    call: NormalizedToolCall,
    tool: ResolvedPluginTool | undefined,
    result: PluginInvokeResult,
    round: number,
  ): PluginCallRecord {
    return {
      callId: call.callId,
      round,
      pluginSlug: tool?.pluginSlug ?? 'unknown',
      toolName: tool?.toolName ?? call.toolName,
      title: tool?.title ?? call.toolName,
      riskLevel: tool?.riskLevel ?? 'READ',
      status: result.status,
      durationMs: result.durationMs,
      truncated: result.truncated,
      ...(result.errorCode === undefined ? {} : { errorCode: result.errorCode }),
      ...(result.status === PluginInvokeStatus.OK && result.content !== undefined
        ? { resultExcerpt: pluginResultExcerpt(result.content) }
        : {}),
    };
  }

  private noteOnce(state: PluginLoopRoundState, code: PluginNoticeCode): void {
    if (!state.notices.some((notice) => notice.code === code)) {
      state.notices.push({ code });
    }
  }

  private withCatalog(
    options: ExecutionOptions,
    definitions: readonly ToolDefinitionDto[],
    toolChoice: ToolChoiceMode,
  ): ExecutionOptions {
    return { ...options, toolCatalog: definitions, toolChoice };
  }

  private withToolInstructions(context: AssembledContext, systemBlock: string): AssembledContext {
    const block = [systemBlock.trim(), PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION]
      .filter((part) => part.length > 0)
      .join('\n\n');
    const existing = context.systemPrompt;
    return {
      ...context,
      systemPrompt: existing === null || existing.length === 0 ? block : `${existing}\n\n${block}`,
    };
  }

  private async plainAnswer(
    args: PluginToolLoopArgs,
    base: AssembledContext,
    options: ExecutionOptions,
    notices: readonly PluginNotice[],
  ): Promise<LlmResponse> {
    const response = await args.callModel({ round: 0, context: base, options });
    return { ...response, pluginNotices: notices };
  }

  private finish(response: LlmResponse, state: PluginLoopRoundState): LlmResponse {
    return {
      ...response,
      // Calls the last round asked for are never run: the answer is what is returned.
      toolCalls: undefined,
      finishedForTools: false,
      pluginCalls: state.records,
      ...(state.notices.length === 0 ? {} : { pluginNotices: state.notices }),
    };
  }
}
