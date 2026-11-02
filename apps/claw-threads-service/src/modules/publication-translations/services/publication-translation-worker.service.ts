import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  TRANSLATION_BATCH_SIZE,
  TRANSLATION_CHUNK_CHARS,
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
  TranslationSource,
  TranslationTarget,
} from '../types/publication-translation.types';
import { splitMarkdownForTranslation } from '../utilities/translation-chunks.utility';
import {
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
  private running = false;

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

  /** One pass. Never throws and never overlaps itself. */
  async runOnce(): Promise<TranslationPassCounts> {
    const counts: TranslationPassCounts = { claimed: 0, ready: 0, failed: 0 };
    if (this.running) return counts;
    this.running = true;
    try {
      const due = await this.repository.findDue(TRANSLATION_BATCH_SIZE);
      for (let start = 0; start < due.length; start += TRANSLATION_CONCURRENCY) {
        const group = due.slice(start, start + TRANSLATION_CONCURRENCY);
        const outcomes = await Promise.all(group.map((target) => this.process(target)));
        for (const outcome of outcomes) {
          if (outcome === TranslationOutcome.SKIPPED) continue;
          counts.claimed += 1;
          if (outcome === TranslationOutcome.READY) counts.ready += 1;
          else counts.failed += 1;
        }
      }
      if (counts.claimed > 0) {
        this.logger.log(
          `Translation pass: ${String(counts.ready)} ready, ${String(counts.failed)} failed of ${String(counts.claimed)}`,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(`Translation pass failed; it will run again: ${errorText(error)}`);
    } finally {
      this.running = false;
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
      const translated = await this.translate(source, target);
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

  /** Translates the title with the first chunk and every other chunk in order. */
  async translate(source: TranslationSource, target: TranslationTarget): Promise<TranslatedThread> {
    const chunks = splitMarkdownForTranslation(source.markdown, TRANSLATION_CHUNK_CHARS);
    if (chunks.length === 0) throw new TranslationModelError('EMPTY_SOURCE');
    const parts: string[] = [];
    let title = '';
    let model = '';
    for (const [index, chunk] of chunks.entries()) {
      const first = index === 0;
      const reply = await this.model.complete(
        TRANSLATION_SYSTEM_PROMPT,
        buildTranslationPrompt({
          from: target.sourceLocale,
          to: target.locale,
          chunk,
          title: first ? source.title : null,
        }),
      );
      model = reply.model;
      if (first) {
        const parsed = parseTitledChunk(reply.content);
        if (parsed === null) {
          this.logger.warn(`Reply did not follow the title shape: ${reply.content.slice(0, 160)}`);
          throw new TranslationModelError('BAD_TITLE_SHAPE');
        }
        title = parsed.title;
        parts.push(parsed.body);
      } else {
        const body = parseBodyChunk(reply.content);
        if (body === null) throw new TranslationModelError('EMPTY_REPLY');
        parts.push(body);
      }
    }
    const markdown = parts.join('\n\n');
    if (!isPlausibleTranslation(source.markdown, markdown)) {
      throw new TranslationModelError('IMPLAUSIBLE_TRANSLATION');
    }
    return { title, markdown, model };
  }
}
