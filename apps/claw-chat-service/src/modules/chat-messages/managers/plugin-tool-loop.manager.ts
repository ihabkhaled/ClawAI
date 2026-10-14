import { Injectable, Logger } from '@nestjs/common';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { ToolChoiceMode } from '../../../common/enums/tool-choice-mode.enum';
import { PluginInvokePort } from '../clients/plugin-invoke.port';
import {
  PLUGIN_CONSENT_DECLINED_TEXT,
  PLUGIN_LOOP_PLAIN_OPTIONS,
  PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION,
} from '../constants/plugin-tools.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import { PluginInvokeStatus } from '../enums/plugin-invoke-status.enum';
import { PluginNoticeCode } from '../enums/plugin-notice-code.enum';
import type { AssembledContext } from '../types/context.types';
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

  constructor(private readonly plugins: PluginInvokePort) {}

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
        result = await this.invoke(args, tool, call, state.tainted);
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
    call: NormalizedToolCall,
    tainted: boolean,
  ): Promise<PluginInvokeResult> {
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
      });
    } catch (error: unknown) {
      this.logger.warn(
        `invoke: ${tool.nativeName} failed — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.refusal('PLUGIN_SERVICE_UNAVAILABLE');
    }
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
        return `The tool did not run (${result.errorCode ?? result.status}). Do not retry it; continue without it.`;
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
