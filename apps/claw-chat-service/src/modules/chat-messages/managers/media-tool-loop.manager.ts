import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  classifyImageIntent,
  classifyVideoIntent,
  MultimodalImageIntent,
} from '@claw/shared-utilities';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { ToolChoiceMode } from '../../../common/enums/tool-choice-mode.enum';
import {
  MEDIA_CANCELLED_TURN_TTL_MS,
  MEDIA_CLAIM_REMOVED_TEXT,
  MEDIA_CLAIM_RETRY_INSTRUCTION,
  MEDIA_CREDIT_ERROR_CODES,
  MEDIA_LOOP_PLAIN_OPTIONS,
  MEDIA_PLAN_ERROR_CODES,
  MEDIA_POLL,
  MEDIA_PROMPT_CARD_CHARS,
  MEDIA_PROMPT_MAX_CHARS,
  MEDIA_RESULT_HINT_BUDGET,
  MEDIA_RESULT_HINT_CANCELLED,
  MEDIA_RESULT_HINT_CREDIT,
  MEDIA_RESULT_HINT_FAILED,
  MEDIA_RESULT_HINT_MODEL_DENIED,
  MEDIA_RESULT_HINT_NO_MODEL,
  MEDIA_RESULT_HINT_PENDING,
  MEDIA_RESULT_HINT_PLAN,
  MEDIA_RESULT_HINT_READY,
  MEDIA_RESULT_HINT_UNKNOWN_TOOL,
  MEDIA_RESULT_TEXT_MAX_CHARS,
  MEDIA_STOPPED_TEXT,
  MEDIA_TOOL_FENCE_SOURCE,
  MEDIA_TOOL_MAX_CALLS_PER_ANSWER,
  MEDIA_TOOL_MAX_ROUNDS,
  MEDIA_TOOL_TURN_BUDGET,
  MEDIA_TOOL_TURN_BUDGET_MAX_KEYS,
  MEDIA_TOOL_TURN_BUDGET_TTL_MS,
  MEDIA_TOOLS_INSTRUCTION,
} from '../constants/media-tools.constants';
import { PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION } from '../constants/plugin-tools.constants';
import { IMAGE_GENERATION_PLAN_FEATURE } from '../constants/plan-feature-refusal.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import { MediaGenerationState } from '../enums/media-generation-state.enum';
import { MediaKind } from '../enums/media-kind.enum';
import { MediaCatalogManager } from './media-catalog.manager';
import { AccessControlService } from '../services/access-control.service';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import type { AssembledContext } from '../types/context.types';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { LlmResponse } from '../types/execution.types';
import type {
  MediaAwaitOutcome,
  MediaCallOutcome,
  MediaGenerationRef,
  MediaLoopState,
  MediaSnapshot,
  MediaStartOutcome,
  MediaTarget,
  MediaToolArgs,
  MediaToolLoopArgs,
} from '../types/media-tools.types';
import type { NormalizedToolCall } from '../types/provider-tool.types';
import type { ToolTurn } from '../types/tool-turn.types';
import { claimsMedia, stripMediaClaims } from '../utilities/media-claim.utility';
import { isAbortedSignal } from '../utilities/media-metadata.utility';
import { detectAudioKind, detectMediaKind } from '../utilities/media-tool-eligibility.utility';
import { awaitMedia, cancelMedia, startMedia } from '../utilities/media-gateway.utility';
import {
  buildMediaToolCatalog,
  kindEntry,
  mediaKindOfTool,
  parseMediaToolArgs,
  resolveMediaTargets,
  toMediaStartRequest,
} from '../utilities/media-tool-definition.utility';
import { fencePluginResult, sanitizePluginText } from '../utilities/plugin-result-fence.utility';
import { latestUserTurnText } from '../utilities/quoted-turn.utility';

/**
 * Lets a tool-calling chat model make media: offers `generate_image`, `generate_video` and
 * `generate_audio`, runs the call through the media gateway, waits (bounded) for the result
 * and feeds it back to the SAME model as the tool result, so the model writes the final reply.
 * The finished media rides on the answer as `mediaGenerations`, which the thread renders as cards.
 *
 * It does not call a model itself. `callModel` is one paid chokepoint call, so every round is
 * metered, held and ledgered by `callProvider` like any other. Plan gate and media metering stay
 * in the media service; the plan is also checked here so a plan without media never sees the
 * tools and a clear media request still gets the existing upgrade notice.
 *
 * A turn cannot spend without limit: `MEDIA_TOOL_MAX_CALLS_PER_ANSWER` calls per answer,
 * `MEDIA_TOOL_TURN_BUDGET` per user message across all Compare lanes, bounded polling, and Stop
 * ends the wait.
 */
@Injectable()
export class MediaToolLoopManager {
  private readonly logger = new Logger(MediaToolLoopManager.name);
  private readonly turnUsage = new Map<string, { used: number; expiresAt: number }>();
  /** Turns the user stopped: no loop for the same user message may start again (an upstream retry). */
  private readonly cancelledTurns = new Map<string, number>();

  constructor(
    private readonly accessControl: AccessControlService,
    @Optional() private readonly cancellation?: StreamCancellationService,
    @Optional() private readonly catalog?: MediaCatalogManager,
  ) {}

  async run(args: MediaToolLoopArgs): Promise<LlmResponse> {
    const base: AssembledContext = { ...args.context, mediaToolsHandled: true };
    const options: ExecutionOptions = {
      ...(args.executionOptions ?? MEDIA_LOOP_PLAIN_OPTIONS),
      fastPathEnabled: false,
    };
    const text = latestUserTurnText(args.context.threadMessages) ?? '';
    if (!(await this.planAllows(args.context.userId))) {
      return this.planDeniedAnswer(args, base, options, text);
    }
    const definitions = buildMediaToolCatalog(Object.values(MediaKind));
    const lastUser = this.lastRealUser(args.context);
    const state: MediaLoopState = {
      context: this.withInstructions(base),
      generations: [],
      callsMade: 0,
      planDenied: false,
      cancelled: false,
      turnKey: `${args.context.userId}:${lastUser?.id ?? 'turn'}`,
      claimRetried: false,
    };
    const threadId = lastUser?.threadId;
    if (this.wasCancelled(state.turnKey)) return this.stoppedAnswer(args.planRefusal(), state);
    const stop = this.registerStop(args.context, threadId);
    const controller = stop.controller;
    try {
      return await this.toolRounds({ args, state, options, definitions, controller });
    } finally {
      if (stop.owned && threadId !== undefined) this.cancellation?.release(threadId);
    }
  }

  /**
   * Only a single-lane chat turn, or the ONE final-answer step of an orchestration, owns the
   * thread's Stop key; Compare lanes run side by side and must not abort each other, so their
   * wait is bounded by the poll cap alone.
   */
  private registerStop(
    context: AssembledContext,
    threadId: string | undefined,
  ): { controller: AbortController | undefined; owned: boolean } {
    if (threadId === undefined || this.cancellation === undefined) {
      return { controller: undefined, owned: false };
    }
    // The final step of an orchestration listens to the turn's own controller (registered for the
    // whole run by `MediaFinalStepManager.runScoped`): registering again would abort that turn.
    if (context.mediaFinalStep === true) {
      const scoped = this.cancellation.getController(threadId);
      if (scoped !== undefined) return { controller: scoped, owned: false };
    }
    const owns =
      (context.platformSurface ?? ChatSurface.CHAT) === ChatSurface.CHAT ||
      context.mediaFinalStep === true;
    return owns
      ? { controller: this.cancellation.register(threadId), owned: true }
      : { controller: undefined, owned: false };
  }

  /** The last message the user typed (a mode's synthetic prompt turn is not one). */
  private lastRealUser(
    context: AssembledContext,
  ): AssembledContext['threadMessages'][number] | undefined {
    return [...context.threadMessages]
      .reverse()
      .find((m) => m.role === 'USER' && !m.id.startsWith('mode-prompt-'));
  }

  /**
   * Media for a final answer whose model cannot call tools (Ollama, any non-tool provider): the
   * user's own request is the prompt, the kind comes from the shared classifiers, and the SAME
   * machinery runs once: plan gate, shared per-message budget, provider fallback list, Stop. The
   * card alone says the rest; no text is added.
   */
  async generateDirect(
    context: AssembledContext,
    signal: AbortSignal | undefined,
  ): Promise<{ generations: MediaGenerationRef[]; cancelled: boolean }> {
    const text = latestUserTurnText(context.threadMessages) ?? '';
    const kind = detectMediaKind(text);
    const lastUser = this.lastRealUser(context);
    const turnKey = `${context.userId}:${lastUser?.id ?? 'turn'}`;
    if (
      kind === undefined ||
      !(await this.planAllows(context.userId)) ||
      !this.takeBudget(turnKey)
    ) {
      return { generations: [], cancelled: false };
    }
    const state: MediaLoopState = {
      context,
      generations: [],
      callsMade: 1,
      planDenied: false,
      cancelled: false,
      turnKey,
      claimRetried: false,
    };
    const toolArgs: MediaToolArgs = {
      kind,
      prompt: text.slice(0, MEDIA_PROMPT_MAX_CHARS),
      audioKind: kind === MediaKind.AUDIO ? detectAudioKind(text) : undefined,
    };
    await this.generate(
      {
        context,
        executionOptions: undefined,
        // The direct path never asks a model or shows a plan notice: these are not called.
        callModel: () => Promise.reject(new Error('generateDirect does not call a model')),
        planRefusal: () => ({ content: '', provider: '', model: '' }) as LlmResponse,
      },
      state,
      toolArgs,
      signal,
    );
    return { generations: state.generations, cancelled: state.cancelled };
  }

  private async planAllows(userId: string): Promise<boolean> {
    try {
      return await this.accessControl.hasPlanFeatureFor(userId, IMAGE_GENERATION_PLAN_FEATURE);
    } catch (error: unknown) {
      this.logger.warn(
        `planAllows: plan lookup failed, media tools not offered - ${error instanceof Error ? error.message : 'error'}`,
      );
      return false;
    }
  }

  /** No tools for this plan: a clear media request gets the existing upgrade notice, else a plain answer. */
  private async planDeniedAnswer(
    args: MediaToolLoopArgs,
    base: AssembledContext,
    options: ExecutionOptions,
    text: string,
  ): Promise<LlmResponse> {
    const clearRequest =
      classifyImageIntent(text, false) === MultimodalImageIntent.GENERATE ||
      classifyVideoIntent(text);
    return clearRequest
      ? args.planRefusal()
      : this.withoutFalseClaim(await args.callModel({ round: 0, context: base, options }), []);
  }

  private async toolRounds(input: {
    args: MediaToolLoopArgs;
    state: MediaLoopState;
    options: ExecutionOptions;
    definitions: readonly ToolDefinitionDto[];
    controller: AbortController | undefined;
  }): Promise<LlmResponse> {
    const { args, state, options, definitions, controller } = input;
    let toolChoice = ToolChoiceMode.AUTO;
    for (let round = 1; round <= MEDIA_TOOL_MAX_ROUNDS; round += 1) {
      // Stop pressed: no further model round.
      if (isAbortedSignal(controller?.signal) || state.cancelled) {
        return this.stoppedAnswer(args.planRefusal(), state);
      }
      const response = await this.modelRound(args, state, round, {
        ...options,
        toolCatalog: definitions,
        toolChoice,
      });
      const calls = response.toolCalls ?? [];
      if (calls.length === 0) {
        // The model announced media no tool made: one retry that forces the tool; if it still
        // announces, `finish` strips the claim. A reply never claims media that does not exist.
        if (!state.claimRetried && this.isFalseClaim(response, state.generations)) {
          state.claimRetried = true;
          toolChoice = ToolChoiceMode.REQUIRED;
          state.context = this.withClaimRetryNote(state.context);
          continue;
        }
        return this.finish(response, state);
      }
      toolChoice = ToolChoiceMode.AUTO;
      const turn = await this.executeCalls(args, state, calls, controller?.signal);
      state.context = {
        ...state.context,
        toolTurns: [
          ...(state.context.toolTurns ?? []),
          { ...turn, assistantText: response.content },
        ],
      };
      // Stop pressed: no further paid model call for an answer nobody is waiting for.
      if (state.cancelled) return this.stoppedAnswer(response, state);
      // A plan refusal on a clear single-lane request shows the existing upgrade notice.
      if (state.planDenied && this.showsPlanNotice(args)) return args.planRefusal();
    }
    // Still asking for tools after the cap: stop offering them and ask for the answer.
    const finalResponse = await args.callModel({
      round: MEDIA_TOOL_MAX_ROUNDS,
      context: state.context,
      options: { ...options, toolCatalog: definitions, toolChoice: ToolChoiceMode.NONE },
    });
    return this.finish(finalResponse, state);
  }

  /**
   * One model round. A model that cannot take tools at all (the request is refused when it
   * carries them) must not turn a media-word message into an error, so a failure on the FIRST
   * round retries once without tools and answers as plain chat.
   */
  private async modelRound(
    args: MediaToolLoopArgs,
    state: MediaLoopState,
    round: number,
    options: ExecutionOptions,
  ): Promise<LlmResponse> {
    try {
      return await args.callModel({ round: round - 1, context: state.context, options });
    } catch (error: unknown) {
      if (round !== 1 && !state.claimRetried) throw error;
      this.logger.warn(
        `modelRound: first round with media tools failed, answering without them - ${error instanceof Error ? error.message : 'error'}`,
      );
      const { toolCatalog: _catalog, toolChoice: _choice, ...plain } = options;
      return args.callModel({
        round: 0,
        context: { ...state.context, systemPrompt: args.context.systemPrompt },
        options: plain,
      });
    }
  }

  private async executeCalls(
    args: MediaToolLoopArgs,
    state: MediaLoopState,
    calls: readonly NormalizedToolCall[],
    signal: AbortSignal | undefined,
  ): Promise<Omit<ToolTurn, 'assistantText'>> {
    const results: ToolTurn['results'][number][] = [];
    for (const call of calls) {
      const outcome = await this.executeCall(args, state, call, signal);
      results.push({
        callId: call.callId,
        content: fencePluginResult({
          pluginSlug: MEDIA_TOOL_FENCE_SOURCE,
          toolName: call.toolName,
          content: outcome.content,
        }),
        isError: outcome.isError,
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

  private async executeCall(
    args: MediaToolLoopArgs,
    state: MediaLoopState,
    call: NormalizedToolCall,
    signal: AbortSignal | undefined,
  ): Promise<MediaCallOutcome> {
    const kind = mediaKindOfTool(call.toolName);
    if (kind === undefined) return this.failure('TOOL_NOT_OFFERED', MEDIA_RESULT_HINT_UNKNOWN_TOOL);
    if (state.cancelled || signal?.aborted === true) {
      state.cancelled = true;
      return this.failure('CANCELLED', MEDIA_RESULT_HINT_CANCELLED);
    }
    if (state.planDenied) return this.failure('PLAN', MEDIA_RESULT_HINT_PLAN);
    if (state.callsMade >= MEDIA_TOOL_MAX_CALLS_PER_ANSWER || !this.takeBudget(state.turnKey)) {
      return this.failure('LIMIT', MEDIA_RESULT_HINT_BUDGET);
    }
    const parsed = parseMediaToolArgs(kind, call.arguments);
    if (!parsed.ok) return this.failure('ARGUMENTS_INVALID', parsed.message);
    state.callsMade += 1;
    return this.generate(args, state, parsed.args, signal);
  }

  /**
   * One tool call: tries the target(s) in order. A provider-side failure (quota, auth, 5xx, a
   * provider that is down) moves on to the next cloud provider, up to the attempt cap; a model the
   * user named is tried alone; credit and plan errors stop at once. Local providers are never tried.
   */
  private async generate(
    args: MediaToolLoopArgs,
    state: MediaLoopState,
    toolArgs: MediaToolArgs,
    signal: AbortSignal | undefined,
  ): Promise<MediaCallOutcome> {
    const userText = latestUserTurnText(args.context.threadMessages);
    const { targets, denied } = await this.targetsFor(args.context.userId, toolArgs, userText);
    if (denied) return this.failure('MODEL_NOT_IN_PLAN', MEDIA_RESULT_HINT_MODEL_DENIED);
    if (targets.length === 0) {
      return this.failure('NO_MODEL', MEDIA_RESULT_HINT_NO_MODEL);
    }
    let last: MediaCallOutcome = this.failure('SERVICE_UNAVAILABLE', MEDIA_RESULT_HINT_FAILED);
    for (const [index, target] of targets.entries()) {
      // Stop pressed: no further provider attempt, ever.
      if (isAbortedSignal(signal)) return this.cancelledOutcome(state);
      const attempt = await this.attempt({
        args,
        state,
        toolArgs,
        target,
        signal,
        isLast: index === targets.length - 1,
      });
      if (attempt.done) return attempt.outcome;
      // A request aborted by Stop looks like an outage; it must not start the next provider.
      if (isAbortedSignal(signal)) return this.cancelledOutcome(state);
      last = attempt.outcome;
    }
    return last;
  }

  /**
   * The targets one call may try. A model the user named is honored alone and ONLY if their plan
   * allows it (a refused model returns `denied` and never falls back to another model); an unlisted
   * name falls back to the shared classifiers, which are access-checked the same way. Otherwise the
   * user's catalog gives the best plan-allowed model per provider, cheapest first; only a catalog
   * outage falls back to the constants.
   */
  private async targetsFor(
    userId: string,
    toolArgs: MediaToolArgs,
    userText: string | undefined,
  ): Promise<{ targets: MediaTarget[]; denied: boolean }> {
    const fallback = resolveMediaTargets(toolArgs, userText);
    const named = toolArgs.model?.trim() ?? '';
    const userNamedIt =
      named.length > 0 && (userText ?? '').toLowerCase().includes(named.toLowerCase());
    if (userNamedIt) return this.namedTargets(userId, toolArgs.kind, named, fallback);
    const candidates = await this.catalog?.candidates(userId, toolArgs.kind, toolArgs.audioKind);
    return { targets: candidates ?? fallback, denied: false };
  }

  private async namedTargets(
    userId: string,
    kind: MediaKind,
    named: string,
    fallback: MediaTarget[],
  ): Promise<{ targets: MediaTarget[]; denied: boolean }> {
    if (this.catalog === undefined) return { targets: fallback, denied: false };
    const lookup = await this.catalog.findNamed(userId, kind, named);
    if (lookup.status === 'found') return { targets: [lookup.target], denied: false };
    if (lookup.status === 'denied') return { targets: [], denied: true };
    // Not in the catalog: every fallback target still has to pass the plan check, so an unknown
    // name can never reach a model the plan does not allow.
    const catalog = this.catalog;
    const checked = await Promise.all(
      fallback.map(async (target) => ({
        target,
        allowed: await catalog.isAllowed(
          userId,
          target.provider.replace(/^(?:IMAGE|VIDEO|AUDIO)_/u, ''),
          target.model ?? named,
        ),
      })),
    );
    const allowedTargets = checked.filter((entry) => entry.allowed).map((entry) => entry.target);
    return allowedTargets.length > 0
      ? { targets: allowedTargets, denied: false }
      : { targets: [], denied: true };
  }

  private async attempt(input: {
    args: MediaToolLoopArgs;
    state: MediaLoopState;
    toolArgs: MediaToolArgs;
    target: MediaTarget;
    signal: AbortSignal | undefined;
    isLast: boolean;
  }): Promise<{ done: boolean; outcome: MediaCallOutcome }> {
    const { args, state, toolArgs, target, signal, isLast } = input;
    const lastUser = this.lastRealUser(args.context);
    const started = await startMedia(
      toMediaStartRequest(toolArgs, target, {
        userId: args.context.userId,
        threadId: lastUser?.threadId,
        userMessageId: lastUser?.id,
      }),
      signal,
    );
    if (!started.ok) {
      if (isAbortedSignal(signal)) return { done: true, outcome: this.cancelledOutcome(state) };
      const stops = started.reason === 'PLAN' || started.reason === 'PAYMENT';
      return { done: stops || isLast, outcome: this.startFailure(state, started) };
    }
    const poll = kindEntry(MEDIA_POLL, toolArgs.kind);
    const outcome = await awaitMedia(toolArgs.kind, started.id, {
      pollMs: poll.pollMs,
      maxPolls: poll.maxPolls,
      signal,
    });
    if (outcome.state === 'cancelled' || isAbortedSignal(signal)) {
      // Stop ends the wait AND the generation: ask the service to cancel it so no row stays RUNNING.
      await cancelMedia(toolArgs.kind, started.id, args.context.userId);
      return { done: true, outcome: this.cancelledOutcome(state) };
    }
    if (outcome.state === 'failed' && !isLast && this.isProviderFailure(outcome.snapshot)) {
      this.logger.warn(
        `attempt: ${target.provider} failed (${outcome.snapshot.errorCode ?? 'unknown'}), trying the next provider`,
      );
      return {
        done: false,
        outcome: this.failure(
          outcome.snapshot.errorCode ?? 'GENERATION_FAILED',
          MEDIA_RESULT_HINT_FAILED,
        ),
      };
    }
    return { done: true, outcome: this.report(state, toolArgs, started, outcome) };
  }

  /** A failure the next provider could avoid: not a plan or credit refusal. */
  private isProviderFailure(snapshot: MediaSnapshot): boolean {
    const code = snapshot.errorCode ?? 'GENERATION_FAILED';
    return !MEDIA_PLAN_ERROR_CODES.has(code) && !MEDIA_CREDIT_ERROR_CODES.has(code);
  }

  /** The saved reply of a stopped turn: never empty, or the upstream retry would run the loop again. */
  private stoppedAnswer(base: LlmResponse, state: MediaLoopState): LlmResponse {
    const { planFeatureRefusal: _refusal, ...rest } = base;
    return {
      ...rest,
      content: MEDIA_STOPPED_TEXT,
      toolCalls: undefined,
      finishedForTools: false,
      ...(state.generations.length === 0 ? {} : { mediaGenerations: state.generations }),
    };
  }

  private wasCancelled(turnKey: string): boolean {
    const expires = this.cancelledTurns.get(turnKey);
    return expires !== undefined && expires > Date.now();
  }

  private cancelledOutcome(state: MediaLoopState): MediaCallOutcome {
    state.cancelled = true;
    this.cancelledTurns.set(state.turnKey, Date.now() + MEDIA_CANCELLED_TURN_TTL_MS);
    return this.failure('CANCELLED', MEDIA_RESULT_HINT_CANCELLED);
  }

  private startFailure(
    state: MediaLoopState,
    started: Extract<MediaStartOutcome, { ok: false }>,
  ): MediaCallOutcome {
    if (started.reason === 'PLAN') {
      state.planDenied = true;
      return this.failure('PLAN', MEDIA_RESULT_HINT_PLAN);
    }
    if (started.reason === 'PAYMENT') {
      return this.failure(
        'CREDIT',
        'The user does not have enough credit for this media. Say so briefly; do not retry.',
      );
    }
    return this.failure(
      started.reason === 'REJECTED' ? 'REJECTED' : 'SERVICE_UNAVAILABLE',
      MEDIA_RESULT_HINT_FAILED,
    );
  }

  private report(
    state: MediaLoopState,
    toolArgs: MediaToolArgs,
    started: Extract<MediaStartOutcome, { ok: true }>,
    outcome: MediaAwaitOutcome,
  ): MediaCallOutcome {
    const ref = (status: MediaGenerationRef['status']): MediaGenerationRef => ({
      kind: toolArgs.kind,
      id: started.id,
      status,
      prompt: toolArgs.prompt.slice(0, MEDIA_PROMPT_CARD_CHARS),
    });
    if (outcome.state === 'cancelled') {
      state.cancelled = true;
      return this.failure('CANCELLED', MEDIA_RESULT_HINT_CANCELLED);
    }
    if (outcome.state === 'failed') {
      return this.reportFailed(state, ref(MediaGenerationState.FAILED), outcome.snapshot);
    }
    if (outcome.state === 'timeout') {
      state.generations.push(ref(MediaGenerationState.IN_PROGRESS));
      return this.success(
        MediaGenerationState.IN_PROGRESS,
        toolArgs,
        started,
        outcome.snapshot,
        MEDIA_RESULT_HINT_PENDING,
      );
    }
    state.generations.push(ref(MediaGenerationState.COMPLETED));
    return this.success(
      MediaGenerationState.COMPLETED,
      toolArgs,
      started,
      outcome.snapshot,
      MEDIA_RESULT_HINT_READY,
    );
  }

  /** Compact JSON for the model: ids and facts, never the bytes and never a link. */
  private success(
    status: MediaGenerationState,
    toolArgs: MediaToolArgs,
    started: Extract<MediaStartOutcome, { ok: true }>,
    snapshot: MediaSnapshot | undefined,
    hint: string,
  ): MediaCallOutcome {
    return {
      isError: false,
      content: JSON.stringify({
        status,
        id: started.id,
        kind: toolArgs.kind,
        provider: started.provider,
        model: snapshot?.model ?? started.model,
        ...(snapshot?.mimeType === undefined ? {} : { mimeType: snapshot.mimeType }),
        ...(snapshot?.durationSec === undefined ? {} : { durationSec: snapshot.durationSec }),
        description: `${toolArgs.kind} made from: ${toolArgs.prompt.slice(0, 120)}`,
        hint,
      }),
    };
  }

  private failure(code: string, hint: string, detail?: string): MediaCallOutcome {
    return {
      isError: true,
      content: JSON.stringify({
        status: 'error',
        code,
        ...(detail === undefined
          ? {}
          : { detail: sanitizePluginText(detail, MEDIA_RESULT_TEXT_MAX_CHARS) }),
        hint,
      }),
    };
  }

  /** One generation off the per-message budget (all Compare lanes share it); false when spent. */
  private takeBudget(key: string): boolean {
    const now = Date.now();
    if (this.turnUsage.size > MEDIA_TOOL_TURN_BUDGET_MAX_KEYS) {
      for (const [stored, entry] of this.turnUsage) {
        if (entry.expiresAt <= now) this.turnUsage.delete(stored);
      }
      if (this.turnUsage.size > MEDIA_TOOL_TURN_BUDGET_MAX_KEYS) this.turnUsage.clear();
    }
    const entry = this.turnUsage.get(key);
    const used = entry === undefined || entry.expiresAt <= now ? 0 : entry.used;
    if (used >= MEDIA_TOOL_TURN_BUDGET) return false;
    this.turnUsage.set(key, { used: used + 1, expiresAt: now + MEDIA_TOOL_TURN_BUDGET_TTL_MS });
    return true;
  }

  private withInstructions(context: AssembledContext): AssembledContext {
    const block = `${MEDIA_TOOLS_INSTRUCTION}\n\n${PLUGIN_UNTRUSTED_RESULTS_INSTRUCTION}`;
    const existing = context.systemPrompt;
    return {
      ...context,
      systemPrompt: existing === null || existing.length === 0 ? block : `${existing}\n\n${block}`,
    };
  }

  /** A failed generation keeps a card (failure state, retry); plan and credit say why plainly. */
  private reportFailed(
    state: MediaLoopState,
    failedRef: MediaGenerationRef,
    snapshot: MediaSnapshot,
  ): MediaCallOutcome {
    state.generations.push(failedRef);
    const code = snapshot.errorCode ?? 'GENERATION_FAILED';
    if (MEDIA_PLAN_ERROR_CODES.has(code)) {
      state.planDenied = true;
      return this.failure('PLAN', MEDIA_RESULT_HINT_PLAN);
    }
    return MEDIA_CREDIT_ERROR_CODES.has(code)
      ? this.failure('CREDIT', MEDIA_RESULT_HINT_CREDIT)
      : this.failure(code, MEDIA_RESULT_HINT_FAILED, snapshot.errorMessage);
  }

  /** Only a single-lane chat turn with a clear media request swaps the answer for the notice. */
  private showsPlanNotice(args: MediaToolLoopArgs): boolean {
    if ((args.context.platformSurface ?? ChatSurface.CHAT) !== ChatSurface.CHAT) return false;
    const text = latestUserTurnText(args.context.threadMessages) ?? '';
    return (
      classifyImageIntent(text, false) === MultimodalImageIntent.GENERATE ||
      classifyVideoIntent(text)
    );
  }

  private isFalseClaim(response: LlmResponse, generations: readonly MediaGenerationRef[]): boolean {
    return (
      claimsMedia(response.content) &&
      !generations.some((generation) => generation.status !== MediaGenerationState.FAILED)
    );
  }

  private withClaimRetryNote(context: AssembledContext): AssembledContext {
    const existing = context.systemPrompt;
    return {
      ...context,
      systemPrompt:
        existing === null || existing.length === 0
          ? MEDIA_CLAIM_RETRY_INSTRUCTION
          : `${existing}\n\n${MEDIA_CLAIM_RETRY_INSTRUCTION}`,
    };
  }

  /** Strips a claim of made media from a reply when no tool result backs it. */
  private withoutFalseClaim(
    response: LlmResponse,
    generations: readonly MediaGenerationRef[],
  ): LlmResponse {
    if (!this.isFalseClaim(response, generations)) return response;
    const stripped = stripMediaClaims(response.content);
    this.logger.warn('withoutFalseClaim: reply claimed media no tool produced, claim removed');
    return { ...response, content: stripped.length > 0 ? stripped : MEDIA_CLAIM_REMOVED_TEXT };
  }

  private finish(rawResponse: LlmResponse, state: MediaLoopState): LlmResponse {
    const response = this.withoutFalseClaim(rawResponse, state.generations);
    return {
      ...response,
      // Calls the last round asked for are never run: the answer is what is returned.
      toolCalls: undefined,
      finishedForTools: false,
      ...(state.generations.length === 0 ? {} : { mediaGenerations: state.generations }),
    };
  }
}
