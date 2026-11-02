import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  TRANSLATION_CHUNK_CHARS,
  TRANSLATION_CHUNK_CONCURRENCY,
  TRANSLATION_CONCURRENCY,
  TRANSLATION_FIRST_TICK_MS,
  TRANSLATION_SYSTEM_PROMPT,
  TRANSLATION_TICK_MS,
} from '../constants/publication-translation.constants';
import { PublicationTranslationsRepository } from '../repositories/publication-translations.repository';
import { TranslationOutcome } from '../../../common/enums/translation-outcome.enum';
import { errorText } from '../../publications/utilities/error-text.utility';
import type {
  TranslatedThread,
  TranslationPassCounts,
  TranslationReply,
  TranslationSource,
  TranslationTarget,
} from '../types/publication-translation.types';
import { splitMarkdownForTranslation } from '../utilities/translation-chunks.utility';
import { mapWithLimit } from '../utilities/translation-pool.utility';
import {
  addsNoLinksOrMarkup,
  isPlausibleTranslation,
  parseBodyChunk,
  parseTitledChunk,
} from '../utilities/translation-output.utility';
import { buildTranslationPrompt } from '../utilities/translation-prompt.utility';
import { TranslationModelClient, TranslationModelError } from './translation-model.client';

/**
 * Keeps a translated copy of every published Thread in every app language (ADR-217).
 *
 * It is a reconciler, not an event consumer: each pass asks the database what has no current
 * copy, so a first publish, a republish, an edit, a missed pass and a Thread published before this
 * existed are all the same case. Replicas share the work through the row claim in the repository.
 */
@Injectable()
export class PublicationTranslationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicationTranslationWorkerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private firstTimer: ReturnType<typeof setTimeout> | undefined;
  private inFlight = 0;

  constructor(
    private readonly repository: PublicationTranslationsRepository,
    private readonly model: TranslationModelClient,
  ) {}

  onModuleInit(): void {
    this.firstTimer = setTimeout(() => void this.runOnce(), TRANSLATION_FIRST_TICK_MS);
    this.timer = setInterval(() => void this.runOnce(), TRANSLATION_TICK_MS);
    this.firstTimer.unref();
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.firstTimer) clearTimeout(this.firstTimer);
  }

  /**
   * One pass: fills the free slots with the newest Threads that have no current copy and waits for
   * those translations. A tick that finds every slot busy does nothing, so a slow Thread never holds
   * up the others and the pool stays full through a backfill. Never throws.
   */
  async runOnce(): Promise<TranslationPassCounts> {
    const counts: TranslationPassCounts = { claimed: 0, ready: 0, failed: 0 };
    const free = TRANSLATION_CONCURRENCY - this.inFlight;
    if (free <= 0) return counts;
    try {
      const due = await this.repository.findDue(free);
      this.inFlight += due.length;
      const outcomes = await Promise.all(
        due.map(async (target) => {
          try {
            return await this.process(target);
          } finally {
            this.inFlight -= 1;
          }
        }),
      );
      for (const outcome of outcomes) {
        if (outcome === TranslationOutcome.SKIPPED) continue;
        counts.claimed += 1;
        if (outcome === TranslationOutcome.READY) counts.ready += 1;
        else counts.failed += 1;
      }
      if (counts.claimed > 0) {
        this.logger.log(
          `Translation pass: ${String(counts.ready)} ready, ${String(counts.failed)} failed of ${String(counts.claimed)}`,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(`Translation pass failed; it will run again: ${errorText(error)}`);
    }
    return counts;
  }

  private async process(target: TranslationTarget): Promise<TranslationOutcome> {
    const claimId = await this.repository.claim(target);
    if (claimId === null) return TranslationOutcome.SKIPPED;
    try {
      const source = await this.repository.loadSource(target.publicationId, target.revision);
      if (source === null) {
        await this.repository.fail(claimId, target.revision, 'SOURCE_CHANGED');
        return TranslationOutcome.FAILED;
      }
      const translated = await this.translate(source, target, () =>
        this.repository.touch(claimId, target.revision),
      );
      const stored = await this.repository.complete(claimId, target.revision, translated);
      if (!stored) return TranslationOutcome.SKIPPED;
      this.logger.log(
        `Translated ${target.publicationId} ${target.sourceLocale}->${target.locale} rev ${String(target.revision)} with ${translated.model}`,
      );
      return TranslationOutcome.READY;
    } catch (error: unknown) {
      const code = error instanceof TranslationModelError ? error.code : 'TRANSLATION_FAILED';
      this.logger.warn(
        `Translation ${target.publicationId} ->${target.locale} failed (${code}): ${errorText(error)}`,
      );
      await this.repository.fail(claimId, target.revision, code);
      return TranslationOutcome.FAILED;
    }
  }

  /**
   * Translates the title with the first chunk, and the chunks two at a time. `onChunk` runs after
   * each one so the claim stays alive while a long Thread is worked through.
   */
  async translate(
    source: TranslationSource,
    target: TranslationTarget,
    onChunk: () => Promise<void> = () => Promise.resolve(),
  ): Promise<TranslatedThread> {
    const chunks = splitMarkdownForTranslation(source.markdown, TRANSLATION_CHUNK_CHARS);
    if (chunks.length === 0) throw new TranslationModelError('EMPTY_SOURCE');
    const replies = await mapWithLimit(
      chunks,
      TRANSLATION_CHUNK_CONCURRENCY,
      async (chunk, index) => {
        const reply = await this.model.complete(
          TRANSLATION_SYSTEM_PROMPT,
          buildTranslationPrompt({
            from: target.sourceLocale,
            to: target.locale,
            chunk,
            title: index === 0 ? source.title : null,
          }),
        );
        await onChunk();
        return reply;
      },
    );
    return this.assemble(source, replies);
  }

  /** Reads the title and the chunks out of the replies and checks the whole before it is kept. */
  private assemble(source: TranslationSource, replies: TranslationReply[]): TranslatedThread {
    const first = replies[0];
    const parsedFirst = first === undefined ? null : parseTitledChunk(first.content);
    if (first === undefined || parsedFirst === null) {
      this.logger.warn(
        `Reply did not follow the title shape: ${(first?.content ?? '').slice(0, 160)}`,
      );
      throw new TranslationModelError('BAD_TITLE_SHAPE');
    }
    const parts = [parsedFirst.body];
    for (const reply of replies.slice(1)) {
      const body = parseBodyChunk(reply.content);
      if (body === null) throw new TranslationModelError('EMPTY_REPLY');
      parts.push(body);
    }
    const title = parsedFirst.title;
    const model = first.model;
    const markdown = parts.join('\n\n');
    if (!isPlausibleTranslation(source.markdown, markdown)) {
      throw new TranslationModelError('IMPLAUSIBLE_TRANSLATION');
    }
    if (!addsNoLinksOrMarkup(`${source.title}\n${source.markdown}`, `${title}\n${markdown}`)) {
      throw new TranslationModelError('UNEXPECTED_LINK_OR_MARKUP');
    }
    return { title, markdown, model };
  }
}
