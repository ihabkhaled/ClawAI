import { Injectable, Logger } from '@nestjs/common';

import { type ChatMessage, type ChatThread } from '../../../generated/prisma';
import { THREAD_HISTORY_FETCH_LIMIT } from '../../../common/constants/execution.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { ModelContextWindowClient } from '../clients/model-context-window.client';
import {
  type ChatContextBundle,
  type ChatContextRequest,
  type ContextLaneTarget,
} from '../types/chat-context-gateway.types';
import { type ThreadSettings } from '../types/execution.types';
import { injectResearchEvidenceIntoContext } from '../utilities/research-prompt.utility';
import { ContextAssemblyManager } from './context-assembly.manager';

/**
 * The one way to ask "what should this model see?".
 *
 * Every surface in this platform needs the same answer — the conversation, the
 * user's memories, their attachments, relevant previous threads, research
 * evidence, the model's real context window — and until this existed each one
 * re-derived it, or did not:
 *
 *  - Compare, Consensus and Escalation each carried a BYTE-FOR-BYTE copy of the
 *    same eighteen-line builder.
 *  - The seven lab modes (Repair, Decompose, Best-of-N, Verifier, Pipeline,
 *    Cost-Ensemble, Role Pack) sent the user's raw string to a model with no
 *    history, no files, no memory and no system prompt.
 *  - The judge and critic REPLACED the conversation with a single synthetic
 *    message, so they judged an answer without seeing the question it answered.
 *  - The coding agent passed `undefined` for attachments and cross-thread
 *    context for months, silently, because the arguments are positional.
 *
 * Those are four shapes of one defect: context was a thing each caller
 * remembered to fetch, rather than a thing the platform provides. A surface now
 * says who it is and what it is about; everything else is this manager's job.
 *
 * It deliberately does NOT call a model. Assembling context and spending money
 * are separate concerns, and keeping them separate is what lets the judge reuse
 * the exact bundle its generator saw.
 */
@Injectable()
export class ChatContextGatewayManager {
  private readonly logger = new Logger(ChatContextGatewayManager.name);

  constructor(
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
    private readonly contextAssemblyManager: ContextAssemblyManager,
    private readonly modelContextWindow: ModelContextWindowClient,
  ) {}

  async build(request: ChatContextRequest): Promise<ChatContextBundle> {
    const { messages, thread } = await this.loadThreadMaterial(request);
    const windowed = this.windowAt(messages, request.routedMessageId);

    const baseSettings = this.extractThreadSettings(thread);
    const withReserve =
      request.maxOutputTokens === undefined
        ? baseSettings
        : { ...(baseSettings ?? {}), maxTokens: request.maxOutputTokens };
    const threadSettings =
      request.provider === undefined && request.laneTargets !== undefined
        ? await this.withSmallestLaneWindow(withReserve, request.laneTargets)
        : await this.withModelContextWindow(withReserve, request.provider, request.model);

    // A caller's explicit list wins: a lab mode receives attachments on its DTO
    // before any message row carries them.
    const fileIds = request.fileIds ?? this.latestUserFileIds(windowed);

    const context = await this.contextAssemblyManager.assemble(
      request.userId,
      windowed,
      threadSettings,
      thread?.contextPackIds ?? undefined,
      fileIds.length > 0 ? fileIds : undefined,
      request.research,
      request.routingMode,
    );

    this.logger.debug(
      `build: surface=${request.surface} thread=${request.threadId ?? 'none'} ` +
        `history=${String(windowed.length)} files=${String(fileIds.length)} ` +
        `memories=${String(context.memories.length)} ` +
        `crossThread=${String(context.crossThread?.selections.length ?? 0)}`,
    );

    // Evidence first (prepended, matching the compare/consensus/escalation
    // shape), then a persona (appended). Both are ADDED to the user's own
    // instructions, never swapped for them — replacing the system prompt is
    // precisely how the judge stopped knowing what the user had asked the
    // model to be.
    const withEvidence = injectResearchEvidenceIntoContext(
      context,
      request.researchEvidenceInstruction ?? '',
    );

    return {
      context: this.withPersona(withEvidence, request.personaInstruction),
      thread,
      threadSettings,
      messages: windowed,
      fileIds,
      latestUserMetadata: this.latestUserMetadata(windowed),
    };
  }

  private async loadThreadMaterial(
    request: ChatContextRequest,
  ): Promise<{ messages: ChatMessage[]; thread: ChatThread | null }> {
    if (request.threadId === null) {
      return { messages: [], thread: null };
    }
    // Both reads at once. Sequential awaits here cost a round trip on every
    // turn of every surface, which is the kind of latency nobody attributes to
    // the thing that caused it.
    const [rows, thread] = await Promise.all([
      this.chatMessagesRepository.findRecentByThreadId(
        request.threadId,
        request.historyLimit ?? THREAD_HISTORY_FETCH_LIMIT,
      ),
      this.chatThreadsRepository.findById(request.threadId),
    ]);
    return { messages: [...rows].reverse(), thread };
  }

  /**
   * History up to and including the routed message.
   *
   * Re-running an older turn must see what that turn saw. Without this a repair
   * or a verifier pass would read everything said since, including the answer
   * it is supposed to be judging.
   */
  private windowAt(messages: ChatMessage[], routedMessageId: string | undefined): ChatMessage[] {
    if (routedMessageId === undefined) {
      return messages;
    }
    // Matched by id alone, not `id && role === 'USER'`. Chat windows at the
    // routed user turn, but Repair windows at the ASSISTANT message it is
    // rewriting — and a USER-only match silently fell through to the whole
    // conversation, handing the repairer the very answers it was meant to be
    // replacing.
    const index = messages.findIndex((message) => message.id === routedMessageId);
    return index < 0 ? messages : messages.slice(0, index + 1);
  }

  private extractThreadSettings(thread: ChatThread | null): ThreadSettings | undefined {
    return !thread
      ? undefined
      : {
          systemPrompt: thread.systemPrompt,
          temperature: thread.temperature,
          maxTokens: thread.maxTokens,
          judgeModel: thread.judgeModel,
          useCrossThreadContext: thread.useCrossThreadContext,
          criticEnabled: thread.criticEnabled,
          criticModel: thread.criticModel,
          qualityThreshold: thread.qualityThreshold,
          maxReRouteAttempts: thread.maxReRouteAttempts,
        };
  }

  /**
   * The model's real context window, not the conservative default.
   *
   * Omitting this is not cosmetic: `resolveModelTokenBudget` falls back to a
   * deliberately small window, so a surface that skips it budgets a 1M-token
   * model as if it were tiny and throws away history it had room for. The
   * coding agent did exactly that.
   */
  private async withModelContextWindow(
    settings: ThreadSettings | undefined,
    provider: string | undefined,
    model: string | undefined,
  ): Promise<ThreadSettings | undefined> {
    if (provider === undefined || model === undefined) {
      return settings;
    }
    const contextWindowTokens = await this.modelContextWindow.findContextWindowTokens(
      provider,
      model,
    );
    return { ...(settings ?? {}), provider, contextWindowTokens };
  }

  /**
   * The smallest real window among the lanes one shared context is sent to.
   *
   * Compare used to name no model here at all, so every lane — a 1M-token one
   * included — was budgeted at the conservative 8k fallback. The smallest lane
   * decides because the one context goes to all of them. If ANY lane's window
   * is unknown the conservative fallback stays: the unknown lane may be the
   * small one, and overfilling it fails that lane at the provider.
   */
  private async withSmallestLaneWindow(
    settings: ThreadSettings | undefined,
    lanes: readonly ContextLaneTarget[],
  ): Promise<ThreadSettings | undefined> {
    if (lanes.length === 0) {
      return settings;
    }
    const windows = await Promise.all(
      lanes.map(async (lane) =>
        this.modelContextWindow.findContextWindowTokens(lane.provider, lane.model),
      ),
    );
    const known = windows.filter((tokens): tokens is number => tokens !== null && tokens > 0);
    if (known.length !== windows.length) {
      this.logger.log(
        `withSmallestLaneWindow: ${String(windows.length - known.length)}/${String(windows.length)} lane window(s) unknown — keeping the conservative window`,
      );
      return settings;
    }
    const contextWindowTokens = Math.min(...known);
    this.logger.log(
      `withSmallestLaneWindow: ${String(lanes.length)} lanes budgeted at the smallest window=${String(contextWindowTokens)}`,
    );
    return { ...(settings ?? {}), contextWindowTokens };
  }

  private latestUserFileIds(messages: ChatMessage[]): string[] {
    const latest = [...messages].reverse().find((message) => message.role === 'USER');
    const metadata = latest?.metadata as Record<string, unknown> | null;
    const fileIds = metadata?.['fileIds'];
    return Array.isArray(fileIds) ? (fileIds as string[]) : [];
  }

  private latestUserMetadata(messages: ChatMessage[]): Record<string, unknown> | null {
    const latest = [...messages].reverse().find((message) => message.role === 'USER');
    return (latest?.metadata as Record<string, unknown> | null) ?? null;
  }

  private withPersona(
    context: ChatContextBundle['context'],
    personaInstruction: string | undefined,
  ): ChatContextBundle['context'] {
    if (personaInstruction === undefined || personaInstruction.trim().length === 0) {
      return context;
    }
    const existing = context.systemPrompt;
    return {
      ...context,
      systemPrompt:
        existing === null || existing.trim().length === 0
          ? personaInstruction
          : `${existing}\n\n${personaInstruction}`,
    };
  }
}
