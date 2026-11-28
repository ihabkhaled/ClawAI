import { Injectable, Logger } from '@nestjs/common';

import { TokenLedgerContext } from '@claw/shared-types';
import {
  LONG_INPUT_EACH_PART_WINDOW_SHARE,
  LONG_INPUT_MAX_LEVELS,
  LONG_INPUT_MIN_PART_CHARS,
  LONG_INPUT_NARRATION_EVERY,
  LONG_INPUT_PARALLEL_PARTS,
  LONG_INPUT_PART_CONTINUE_ROUNDS,
  LONG_INPUT_PART_WINDOW_SHARE,
  LONG_OUTPUT_CONTINUE_NOTE,
  LONG_OUTPUT_LENGTH_FINISH_REASONS,
} from '../constants/long-input.constants';
import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import { NarrationService } from '../services/narration.service';
import type { AssembledContext } from '../types/context.types';
import type {
  LongInputReadRequest,
  LongInputResult,
  OversizedFile,
} from '../types/long-input.types';
import { mapWithConcurrency } from '../utilities/bounded-parallel.utility';
import {
  buildEachPartPrompt,
  buildMergePrompt,
  buildModeJudgePrompt,
  buildPartPrompt,
  formatReadingNotes,
  parseEachPartVerdict,
  planParts,
  splitIntoParts,
} from '../utilities/long-input.utility';
import { RESEARCH_PLANNER_MIN_OUTPUT_TOKENS } from '../../../common/constants/research-gate.constants';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { ChatStreamService } from '../services/chat-stream.service';
import { ResearchGateService } from '../services/research-gate.service';
import type { LlmResponse } from '../types/execution.types';
import { APPROX_CHARS_PER_TOKEN } from '../../../common/constants/execution.constants';
import { resolveModelTokenBudget } from '../utilities/model-token-budget.utility';
import { ChatExecutionManager } from './chat-execution.manager';

/**
 * Reads a file that does not fit the answering model's window in model-sized parts (ADR-231): each part is one
 * metered call through `callProvider` with the user's request, the notes of every part replace the file's text in
 * the answering prompt, and notes that still do not fit are merged again. A part that fails keeps its place with a
 * one-line gap note, so the answer never claims a part it did not see.
 */
@Injectable()
export class LongInputReaderManager {
  private readonly logger = new Logger(LongInputReaderManager.name);

  constructor(
    private readonly execution: ChatExecutionManager,
    private readonly narration: NarrationService,
    private readonly gate: ResearchGateService,
    private readonly stream: ChatStreamService,
  ) {}

  async readAll(input: LongInputReadRequest): Promise<LongInputResult> {
    const oversized = input.context.oversizedFiles ?? [];
    if (oversized.length === 0) {
      return { context: input.context, answer: null };
    }
    if (await this.appliesToEachPart(input.request)) {
      return {
        context: input.context,
        answer: await this.answerEachPart(
          input,
          oversized,
          this.partChars(input, LONG_INPUT_EACH_PART_WINDOW_SHARE),
        ),
      };
    }
    const partChars = this.partChars(input, LONG_INPUT_PART_WINDOW_SHARE);
    const notesById = new Map<string, string>();
    for (const file of oversized) {
      notesById.set(file.fileId, await this.readFile(input, file, partChars));
    }
    return {
      answer: null,
      context: {
        ...input.context,
        oversizedFiles: [],
        fileContents: input.context.fileContents.map((file) => {
          const notes = notesById.get(file.id);
          return notes === undefined ? file : { ...file, extractedText: notes };
        }),
      },
    };
  }

  /** One judge call through the planner chain; any failure reads the file as notes. */
  private async appliesToEachPart(request: string): Promise<boolean> {
    try {
      return (
        (await this.gate.askPlanner(
          buildModeJudgePrompt(request),
          RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
          parseEachPartVerdict,
        )) === true
      );
    } catch {
      return false;
    }
  }

  /**
   * Each-part mode: the request is carried out on every part, the results are joined in document order and streamed
   * as they complete in order; that joined text IS the answer (no notes, no final call).
   */
  private async answerEachPart(
    input: LongInputReadRequest,
    files: readonly OversizedFile[],
    partChars: number,
  ): Promise<LlmResponse> {
    const startedAt = Date.now();
    const sections: string[] = [];
    const emitted = { chars: 0 };
    for (const file of files) {
      const plan = planParts(splitIntoParts(file.text, partChars));
      await this.narrate(input, file, plan.total, 0);
      const results = new Map<number, string>();
      let next = 0;
      const heading = files.length > 1 ? `## ${file.filename}\n\n` : '';
      this.emit(input, heading, emitted);
      await mapWithConcurrency(plan.picked, LONG_INPUT_PARALLEL_PARTS, async (part, slot) => {
        const result = await this.askUntilDone(
          input,
          buildEachPartPrompt(input.request, file.filename, part.index + 1, plan.total, part.text),
          `${input.payload.messageId}:each:${file.fileId}:${String(part.index)}`,
        );
        results.set(slot, result ?? `[Part ${String(part.index + 1)} could not be processed.]`);
        for (let text = results.get(next); text !== undefined; text = results.get(next)) {
          this.emit(input, `${next === 0 ? '' : '\n\n'}${text}`, emitted);
          next += 1;
        }
      });
      await this.narrate(input, file, plan.total, plan.total);
      sections.push(
        `${heading}${plan.picked.map((_part, slot) => results.get(slot) ?? '').join('\n\n')}`,
      );
    }
    const content = sections.join('\n\n');
    this.logger.log(
      `answerEachPart: files=${String(files.length)} chars=${String(content.length)}`,
    );
    return {
      content,
      provider: input.payload.selectedProvider,
      model: input.payload.selectedModel,
      outputTokens: estimateTokensFromText(content),
      latencyMs: Date.now() - startedAt,
      usedFallback: false,
      finishReason: 'stop',
    };
  }

  private emit(input: LongInputReadRequest, delta: string, emitted: { chars: number }): void {
    if (delta.length === 0) {
      return;
    }
    emitted.chars += delta.length;
    this.stream.emitContentDelta(input.payload.threadId, {
      provider: input.payload.selectedProvider,
      model: input.payload.selectedModel,
      messageId: input.payload.messageId,
      delta,
      accumulatedChars: emitted.chars,
    });
  }

  private async narrate(
    input: LongInputReadRequest,
    file: OversizedFile,
    parts: number,
    done: number,
  ): Promise<void> {
    await this.narration.append(input.payload.threadId, {
      kind: NarrationKind.LONG_INPUT,
      params: { name: file.filename, parts, done },
    });
  }

  private partChars(input: LongInputReadRequest, share: number): number {
    const window = resolveModelTokenBudget({
      contextWindowTokens: input.threadSettings?.contextWindowTokens ?? null,
      provider: input.threadSettings?.provider ?? null,
      requestedOutputTokens: input.threadSettings?.maxTokens ?? null,
      systemOverheadTokens: 0,
      toolOverheadTokens: 0,
    });
    return Math.max(
      LONG_INPUT_MIN_PART_CHARS,
      Math.floor(window.availableInputTokens * APPROX_CHARS_PER_TOKEN * share),
    );
  }

  private async readFile(
    input: LongInputReadRequest,
    file: OversizedFile,
    partChars: number,
  ): Promise<string> {
    const plan = planParts(splitIntoParts(file.text, partChars));
    const threadId = input.payload.threadId;
    await this.narration.append(threadId, {
      kind: NarrationKind.LONG_INPUT,
      params: { name: file.filename, parts: plan.total, done: 0 },
    });
    let done = 0;
    const notes = await mapWithConcurrency(plan.picked, LONG_INPUT_PARALLEL_PARTS, async (part) => {
      const note = await this.ask(
        input,
        buildPartPrompt(input.request, file.filename, part.index + 1, plan.total, part.text),
        `${input.payload.messageId}:read:${file.fileId}:${String(part.index)}`,
      );
      done += 1;
      if (done % LONG_INPUT_NARRATION_EVERY === 0 && done < plan.picked.length) {
        await this.narration.append(threadId, {
          kind: NarrationKind.LONG_INPUT,
          params: { name: file.filename, parts: plan.total, done },
        });
      }
      return note ?? `[Part ${String(part.index + 1)} could not be read.]`;
    });
    const joined = notes.join('\n\n');
    const merged = await this.fit(input, file, joined, partChars * 2, 1);
    await this.narration.append(threadId, {
      kind: NarrationKind.LONG_INPUT,
      params: { name: file.filename, parts: plan.total, done: plan.total },
    });
    this.logger.log(
      `readAll: file=${file.fileId} chars=${String(file.text.length)} parts=${String(plan.total)} read=${String(plan.picked.length)} notesChars=${String(merged.length)}`,
    );
    return merged === joined
      ? formatReadingNotes(file.filename, plan, notes)
      : formatReadingNotes(file.filename, plan, [merged], true);
  }

  /** Notes longer than the room for them are merged part by part, at most LONG_INPUT_MAX_LEVELS times. */
  private async fit(
    input: LongInputReadRequest,
    file: OversizedFile,
    notes: string,
    room: number,
    level: number,
  ): Promise<string> {
    if (notes.length <= room || level > LONG_INPUT_MAX_LEVELS) {
      return notes;
    }
    const chunks = splitIntoParts(notes, room);
    const merged = await mapWithConcurrency(
      chunks,
      LONG_INPUT_PARALLEL_PARTS,
      async (chunk, index) =>
        (await this.ask(
          input,
          buildMergePrompt(input.request, file.filename, chunk),
          `${input.payload.messageId}:merge:${file.fileId}:${String(level)}:${String(index)}`,
        )) ?? chunk,
    );
    return this.fit(input, file, merged.join('\n\n'), room, level + 1);
  }

  /** A part's result, continued while the output limit cuts it (each-part mode). Null when the first call fails. */
  private async askUntilDone(
    input: LongInputReadRequest,
    prompt: string,
    requestId: string,
  ): Promise<string | null> {
    let reply = await this.call(input, [prompt], requestId);
    if (reply === null) {
      return null;
    }
    let text = reply.content;
    for (let round = 1; round <= LONG_INPUT_PART_CONTINUE_ROUNDS && this.isCut(reply); round += 1) {
      reply = await this.call(
        input,
        [prompt, text, LONG_OUTPUT_CONTINUE_NOTE],
        `${requestId}:more:${String(round)}`,
      );
      if (reply === null) {
        break;
      }
      text += reply.content;
    }
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isCut(reply: LlmResponse): boolean {
    return (
      reply.finishReason !== undefined && LONG_OUTPUT_LENGTH_FINISH_REASONS.has(reply.finishReason)
    );
  }

  /** One metered call with only the instruction as context (no history, memory or files). Null on failure. */
  private async ask(
    input: LongInputReadRequest,
    prompt: string,
    requestId: string,
  ): Promise<string | null> {
    const reply = await this.call(input, [prompt], requestId);
    const text = reply?.content.trim() ?? '';
    return text.length > 0 ? text : null;
  }

  /** `turns` alternate user, assistant, user, … starting with the instruction. Null on failure. */
  private async call(
    input: LongInputReadRequest,
    turns: readonly string[],
    requestId: string,
  ): Promise<LlmResponse | null> {
    const base = input.context;
    const anchor = base.threadMessages.at(-1);
    if (anchor === undefined) {
      return null;
    }
    const context: AssembledContext = {
      ...base,
      systemPrompt: null,
      threadMessages: turns.map((content, index) => ({
        ...anchor,
        id: `${anchor.id}:read:${String(index)}`,
        role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
        content,
        metadata: null,
      })),
      memories: [],
      contextPackItems: [],
      fileContents: [],
      workspaceCitations: [],
      researchEvidence: [],
      researchRequested: false,
      oversizedFiles: [],
    };
    try {
      const reply = await this.execution.callProvider(
        input.payload.selectedProvider,
        input.payload.selectedModel,
        context,
        Date.now(),
        false,
        input.threadSettings,
        input.payload.routingMode,
        undefined,
        TokenLedgerContext.CHAT,
        { requestId, threadId: input.payload.threadId, workflow: 'long-input-read' },
      );
      return reply;
    } catch (error: unknown) {
      this.logger.warn(
        `ask: ${requestId} failed - ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
