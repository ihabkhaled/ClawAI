import { Injectable, Logger } from '@nestjs/common';
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
  mightBeSaveRequest,
  packContentFor,
  parseSaveIntentVerdict,
  previousMessageText,
} from '../utilities/save-intent.utility';
import { SaveToContextManager } from './save-to-context.manager';

/**
 * "Remember this / add this to my context" decided by a model (ADR-133).
 *
 * 1. A broad multilingual pre-filter decides whether to ASK at all, so an
 *    ordinary turn costs nothing extra.
 * 2. The admin's planner model (the research gate's candidates) reads the
 *    message, the one before it and the user's pack names, and answers JSON:
 *    save or not, memory (type + one concise sentence), context pack (which
 *    text, which pack), or both.
 * 3. The saves run through memory-service's owner-scoped internal routes.
 *    A pack the user did not name, when they already have packs, is NOT
 *    guessed: the answer carries a "which pack?" card instead.
 * 4. The answering model is told exactly what happened, and the answer stores
 *    the record the card renders.
 *
 * With no planner reachable, the deterministic keyword path (the previous
 * behaviour) still saves — the feature never goes dark.
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
    if (lastUser === undefined || !mightBeSaveRequest(lastUser.content)) return null;
    const previousText = previousMessageText(messages, lastUser);
    const packs = await this.client.listPacks(userId);
    const verdict = await this.planner.askPlanner(
      buildSaveIntentPrompt({
        userText: lastUser.content,
        previousText,
        packNames: packs.map((pack) => pack.name),
      }),
      SAVE_INTENT_MAX_OUTPUT_TOKENS,
      parseSaveIntentVerdict,
    );
    if (verdict === null) return this.fallback(userId, threadId, messages);
    this.logger.log(
      `handle: thread=${threadId} save=${String(verdict.save)} memory=${String((verdict.memory ?? null) !== null)} pack=${String((verdict.contextPack ?? null) !== null)}`,
    );
    if (
      !verdict.save ||
      ((verdict.memory ?? null) === null && (verdict.contextPack ?? null) === null)
    ) {
      return null;
    }
    const record = await this.execute({ userId, threadId, lastUser, previousText, packs, verdict });
    return { kind: 'AI', record, modelNote: contextSaveModelNote(record) };
  }

  /** The planner could not answer: the keyword command path decides, as before. */
  private async fallback(
    userId: string,
    threadId: string,
    messages: readonly ChatMessage[],
  ): Promise<ContextSaveDecision | null> {
    const outcome = await this.legacy.trySave(userId, threadId, messages);
    if (outcome !== null)
      this.logger.warn(`fallback: thread=${threadId} planner unavailable — keyword save`);
    return outcome === null ? null : { kind: 'LEGACY', outcome };
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
