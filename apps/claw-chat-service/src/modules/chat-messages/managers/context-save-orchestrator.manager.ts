import { Injectable, Logger } from '@nestjs/common';
import { detectSaveToContextIntent } from '@claw/shared-utilities';
import type { ContextSaveMode } from '@claw/shared-types';
import { ContextSaveStatus, type MemoryRecordType } from '../../../common/enums';
import type { ChatMessage } from '../../../generated/prisma';
import { ContextSaveClient } from '../clients/context-save.client';
import {
  SAVE_INTENT_MAX_OUTPUT_TOKENS,
  SAVE_PACK_CHOICE_MAX_OPTIONS,
  SAVE_PACK_CONTENT_MAX_CHARS,
} from '../constants/save-intent.constants';
import type { SaveIntentVerdict } from '../dto/save-intent-verdict.dto';
import { ResearchGateService } from '../services/research-gate.service';
import type {
  ChatPackOptionResponse,
  ContextSaveDecision,
  ContextSaveRecord,
} from '../types/context-save.types';
import { contextPackDeepLink, memoryDeepLink } from '../utilities/context-save-links.utility';
import { previewOf, savedPackName } from '../utilities/save-confirmation.utility';
import {
  buildSaveIntentPrompt,
  contextSaveModelNote,
  guardSaveVerdict,
  mightBeSaveRequest,
  packContentFor,
  parseSaveIntentVerdict,
  previousMessage,
  previousMessageText,
} from '../utilities/save-intent.utility';
import {
  buildKeywordSaveProposal,
  buildSaveProposal,
  contextSaveModeOf,
} from '../utilities/save-proposal.utility';
import { SaveToContextManager } from './save-to-context.manager';

/**
 * "Remember this / add this to my context" decided by a model (ADR-134).
 *
 * 1. A broad multilingual pre-filter decides whether to ASK at all, so an
 *    ordinary turn costs nothing extra.
 * 2. The admin's planner model (the research gate's candidates) reads the
 *    message, the one before it and the user's pack names, and answers JSON:
 *    save or not, memory (type + one concise sentence), context pack (which
 *    text, which pack), or both.
 * 3. ASK mode (the default, ADR-168) stops here: the verdict becomes a PROPOSED
 *    record the user edits and confirms in a modal. AUTO mode continues: the
 *    saves run through memory-service's owner-scoped internal routes.
 *    A pack the user did not name, when they already have packs, is NOT
 *    guessed: the answer carries a "which pack?" card instead.
 * 4. The answering model is told exactly what happened, and the answer stores
 *    the record the card renders.
 *
 * With no planner reachable, the deterministic keyword path still works — the
 * feature never goes dark. In AUTO mode it saves (the previous behaviour); in ASK
 * mode it PROPOSES the same form from what the keyword detector recognised,
 * because ASK means nothing is written before the user confirms (ADR-168).
 */
@Injectable()
export class ContextSaveOrchestratorManager {
  private readonly logger = new Logger(ContextSaveOrchestratorManager.name);

  constructor(
    private readonly planner: ResearchGateService,
    private readonly client: ContextSaveClient,
    private readonly legacy: SaveToContextManager,
  ) {}

  /** Null when the turn is not a save request — the ordinary chat path runs. */
  async handle(
    userId: string,
    threadId: string,
    messages: readonly ChatMessage[],
  ): Promise<ContextSaveDecision | null> {
    const lastUser = [...messages].reverse().find((message) => message.role === 'USER');
    if (lastUser === undefined) return null;
    const previous = previousMessage(messages, lastUser);
    if (!mightBeSaveRequest(lastUser.content, previous?.role === 'ASSISTANT')) return null;
    const previousText = previousMessageText(messages, lastUser);
    const mode = contextSaveModeOf(lastUser);
    const packs = await this.client.listPacks(userId);
    const verdict = await this.planner.askPlanner(
      buildSaveIntentPrompt({
        userText: lastUser.content,
        previousText,
        packNames: packs.map((pack) => pack.name),
        proposeFirst: mode === 'ASK',
      }),
      SAVE_INTENT_MAX_OUTPUT_TOKENS,
      parseSaveIntentVerdict,
    );
    if (verdict === null) {
      return this.fallback({ userId, threadId, messages, lastUser, previousText, packs, mode });
    }
    this.logger.log(
      `handle: thread=${threadId} save=${String(verdict.save)} memory=${String((verdict.memory ?? null) !== null)} pack=${String((verdict.contextPack ?? null) !== null)}`,
    );
    if (
      !verdict.save ||
      ((verdict.memory ?? null) === null && (verdict.contextPack ?? null) === null)
    ) {
      return null;
    }
    // Never store the command itself as the material (rule 57 §17): with nothing
    // real to save the turn goes to the answering model, which writes the
    // material, and the user saves it with the Save buttons.
    const guarded = guardSaveVerdict(verdict, lastUser.content, previousText);
    if (guarded === null) {
      this.logger.warn(
        `handle: thread=${threadId} planner said save=true but the message names no material — falling through to the model`,
      );
      return null;
    }
    // ASK (the default): the user reviews and confirms a form before anything
    // is written (ADR-168). AUTO saves at once, exactly as ADR-134 did.
    if (mode === 'ASK') {
      const proposed: ContextSaveRecord = {
        status: ContextSaveStatus.PROPOSED,
        sourceMessageId: lastUser.id,
        proposal: buildSaveProposal({
          verdict: guarded,
          userText: lastUser.content,
          previousText,
          packs,
        }),
      };
      this.logger.log(`handle: thread=${threadId} proposed a save — waiting for the user`);
      return { kind: 'AI', record: proposed, modelNote: contextSaveModelNote(proposed) };
    }
    const record = await this.execute({
      userId,
      threadId,
      lastUser,
      previousText,
      packs,
      verdict: guarded,
    });
    return { kind: 'AI', record, modelNote: contextSaveModelNote(record) };
  }

  /**
   * The planner could not answer: the keyword command path decides. AUTO saves
   * as before; ASK proposes (nothing is written before the user confirms).
   */
  private async fallback(args: {
    userId: string;
    threadId: string;
    messages: readonly ChatMessage[];
    lastUser: ChatMessage;
    previousText: string;
    packs: ChatPackOptionResponse[];
    mode: ContextSaveMode;
  }): Promise<ContextSaveDecision | null> {
    if (args.mode === 'ASK') return this.proposeFromKeywords(args);
    const outcome = await this.legacy.trySave(args.userId, args.threadId, args.messages);
    if (outcome !== null) {
      this.logger.warn(`fallback: thread=${args.threadId} planner unavailable — keyword save`);
    }
    return outcome === null ? null : { kind: 'LEGACY', outcome };
  }

  private proposeFromKeywords(args: {
    threadId: string;
    lastUser: ChatMessage;
    previousText: string;
    packs: ChatPackOptionResponse[];
  }): ContextSaveDecision | null {
    const intent = detectSaveToContextIntent(args.lastUser.content);
    if (intent === null) return null;
    const proposal = buildKeywordSaveProposal({
      intent,
      userText: args.lastUser.content,
      previousText: args.previousText,
      packs: args.packs,
    });
    // A bare "save this" with nothing above it: the legacy one-line question.
    if (proposal === null) return { kind: 'LEGACY', outcome: { kind: 'ASK' } };
    const proposed: ContextSaveRecord = {
      status: ContextSaveStatus.PROPOSED,
      sourceMessageId: args.lastUser.id,
      proposal,
    };
    this.logger.warn(
      `fallback: thread=${args.threadId} planner unavailable — proposed a keyword save, waiting for the user`,
    );
    return { kind: 'AI', record: proposed, modelNote: contextSaveModelNote(proposed) };
  }

  private async execute(args: {
    userId: string;
    threadId: string;
    lastUser: ChatMessage;
    previousText: string;
    packs: ChatPackOptionResponse[];
    verdict: SaveIntentVerdict;
  }): Promise<ContextSaveRecord> {
    const record: ContextSaveRecord = { status: ContextSaveStatus.SAVED };
    const memory = args.verdict.memory ?? null;
    if (memory !== null) {
      await this.saveMemory(
        record,
        args.userId,
        args.threadId,
        args.lastUser.id,
        memory.type,
        memory.text,
      );
    }
    const pack = args.verdict.contextPack ?? null;
    if (pack !== null) {
      const content = packContentFor(
        pack.source,
        args.lastUser.content,
        args.previousText,
        pack.summary,
      );
      await this.savePack(record, args, content, pack.packName ?? null, pack.newPackName ?? null);
    }
    const nothingSaved =
      record.memory === undefined && record.pack === undefined && record.pending === undefined;
    if (nothingSaved) record.status = ContextSaveStatus.FAILED;
    return record;
  }

  private async saveMemory(
    record: ContextSaveRecord,
    userId: string,
    threadId: string,
    sourceMessageId: string,
    type: MemoryRecordType,
    text: string,
  ): Promise<void> {
    const result = await this.client.saveMemory({
      userId,
      threadId,
      sourceMessageId,
      type,
      content: text,
    });
    if (!result.ok) {
      record.memoryFailure = result.reason;
      return;
    }
    record.memory = {
      id: result.value.id,
      type,
      preview: previewOf(text),
      link: memoryDeepLink(result.value.id),
    };
  }

  /**
   * Which pack: the one the user named (matched to their packs, else created
   * under that name); with no name and packs to choose from, ask; with no
   * packs at all, a new one named from the content.
   */
  private async savePack(
    record: ContextSaveRecord,
    args: { userId: string; lastUser: ChatMessage; packs: ChatPackOptionResponse[] },
    content: string,
    packName: string | null,
    newPackName: string | null,
  ): Promise<void> {
    if (content.length === 0) {
      record.packFailure = 'UNAVAILABLE';
      return;
    }
    if (content.length > SAVE_PACK_CONTENT_MAX_CHARS) {
      record.packFailure = 'LIMIT';
      return;
    }
    const named =
      packName === null
        ? undefined
        : args.packs.find((option) => option.name.toLowerCase() === packName.toLowerCase());
    if (named !== undefined) {
      const added = await this.client.addToPack({
        userId: args.userId,
        packId: named.id,
        sourceMessageId: args.lastUser.id,
        content,
      });
      if (added.ok)
        record.pack = {
          id: named.id,
          name: named.name,
          created: false,
          link: contextPackDeepLink(named.id),
        };
      else record.packFailure = added.reason;
      return;
    }
    const suggestedName = packName ?? newPackName ?? savedPackName(content);
    if (packName === null && args.packs.length > 0) {
      record.status = ContextSaveStatus.NEEDS_PACK_CHOICE;
      record.pending = {
        sourceMessageId: args.lastUser.id,
        content,
        suggestedName,
        options: args.packs
          .slice(0, SAVE_PACK_CHOICE_MAX_OPTIONS)
          .map((option) => ({ id: option.id, name: option.name })),
      };
      return;
    }
    const created = await this.client.createPack({
      userId: args.userId,
      sourceMessageId: args.lastUser.id,
      name: suggestedName,
      content,
    });
    if (created.ok)
      record.pack = {
        id: created.value.id,
        name: created.value.name,
        created: created.value.created,
        link: contextPackDeepLink(created.value.id),
      };
    else record.packFailure = created.reason;
  }
}
