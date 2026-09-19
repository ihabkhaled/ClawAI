import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  NARRATION_APPEND_SCRIPT,
  NARRATION_DEDUPE_KEY_PREFIX,
  NARRATION_LOG_KEY_PREFIX,
  NARRATION_MAX_ENTRIES,
  NARRATION_TTL_SECONDS,
} from '../constants/narration.constants';
import type { NarrationEntry, NarrationInput } from '../types/narration.types';
import { ChatStreamService } from './chat-stream.service';

/**
 * A turn's narrated work log: "I'll read that site first" -> crawling ->
 * 14 pages read -> back to the AI -> searching -> thinking.
 *
 * Every line is streamed live AND kept, because the live stream alone was lost
 * on refresh: the progress panel lived in React state, and the Redis replay was
 * capped at 100 frames and wiped mid-turn. The log is copied onto the assistant
 * message when it is stored, so it becomes part of chat history.
 *
 * Kept in Redis between steps because the steps run on different replicas: the
 * plan and the crawl run where the request landed, the answer where the routed
 * event was consumed.
 */
@Injectable()
export class NarrationService {
  private readonly logger = new Logger(NarrationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly chatStream: ChatStreamService,
  ) {}

  /** Starts a fresh log for the thread's next turn. */
  async reset(threadId: string): Promise<void> {
    try {
      await this.redis.del(`${NARRATION_LOG_KEY_PREFIX}${threadId}`);
    } catch (error) {
      this.logger.warn(`reset: ${(error as Error).message}`);
    }
  }

  /**
   * Appends a line and streams it. With a `dedupeKey`, only the first replica
   * to claim it does either; the rest drop it.
   *
   * Never throws: a narration failure must not fail the turn it narrates.
   */
  async append(threadId: string, input: NarrationInput, dedupeKey?: string): Promise<void> {
    const entry: NarrationEntry = { ...input, id: randomUUID(), at: new Date().toISOString() };
    try {
      const appended = await this.redis
        .getClient()
        .eval(
          NARRATION_APPEND_SCRIPT,
          2,
          `${NARRATION_LOG_KEY_PREFIX}${threadId}`,
          dedupeKey === undefined ? '' : `${NARRATION_DEDUPE_KEY_PREFIX}${dedupeKey}`,
          JSON.stringify(entry),
          String(NARRATION_TTL_SECONDS),
          String(NARRATION_MAX_ENTRIES),
        );
      if (appended !== 1) {
        return;
      }
    } catch (error) {
      // Still streamed: the live view should not go dark because the store did.
      this.logger.warn(`append: ${(error as Error).message}`);
    }
    this.chatStream.emitNarration(threadId, entry);
  }

  /** The turn's log so far, in order. Empty when there is none. */
  async read(threadId: string): Promise<NarrationEntry[]> {
    try {
      const raw = await this.redis
        .getClient()
        .lrange(`${NARRATION_LOG_KEY_PREFIX}${threadId}`, 0, -1);
      return raw.flatMap((line) => {
        try {
          return [JSON.parse(line) as NarrationEntry];
        } catch {
          return [];
        }
      });
    } catch (error) {
      this.logger.warn(`read: ${(error as Error).message}`);
      return [];
    }
  }
}
