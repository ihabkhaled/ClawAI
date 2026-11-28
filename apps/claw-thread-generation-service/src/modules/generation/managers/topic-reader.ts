import { z } from 'zod';

import type { ChatModelResponse } from '../../models/chat-model.client';
import { THREADS_ASSUMED_WINDOW_TOKENS } from '../../models/constants/model-context.constants';
import {
  TOPIC_CHARS_PER_TOKEN,
  TOPIC_GAP_SPEND,
  TOPIC_GAP_UNREADABLE,
  TOPIC_HEAD_CHARS,
  TOPIC_NOTES_CHARS_PER_OUTPUT_TOKEN,
  TOPIC_NOTES_MIN_PART_CHARS,
  TOPIC_NOTES_OVERRUN_FACTOR,
  TOPIC_NOTES_TARGET_CHARS,
  TOPIC_PART_ROLE_PREFIX,
  TOPIC_PART_WINDOW_SHARE,
  TOPIC_READER_HEAL_ATTEMPTS,
  TOPIC_READER_MAX_OUTPUT_TOKENS,
  TOPIC_READER_MIN_OUTPUT_TOKENS,
  TOPIC_READER_OUTPUT_SLACK_TOKENS,
  TOPIC_READER_REPLY_SHAPE,
  TOPIC_READER_SPEND_CEILING_PERCENT,
  TOPIC_READING_CODE,
  TOPIC_READING_CONCURRENCY,
} from '../constants/topic-reading.constants';
import type { HealingBudget, RoleCallSpec } from '../types/healing.types';
import type { GenerationPipelineInput, ModelRole } from '../types/generation-pipeline.types';
import type { StepRecordInput } from '../types/step-recorder.types';
import { parseModelJson } from '../utilities/parse-model-json.utility';
import { pickPartIndexes, splitTopic } from '../utilities/split-topic.utility';
import {
  buildTopicNotes,
  buildTopicReaderSystemPrompt,
  buildTopicReaderUserPrompt,
} from '../utilities/topic-reading-prompt.utility';
import { isCancellation, pickBriefRole } from './article-brief-planner';

const PERCENT = 100;
const notesSchema = z.object({ notes: z.string().trim().min(1) });

export type TopicReaderDeps = {
  call: (
    input: GenerationPipelineInput,
    budget: HealingBudget,
    spec: RoleCallSpec,
  ) => Promise<ChatModelResponse>;
  /** The job's spend so far, or null when unknown. */
  spentMicroUsd: (jobId: string) => Promise<number | null>;
  /** The model's context window in tokens, or null when no source knows it. */
  windowTokens: (provider: string, model: string) => Promise<number | null>;
  record: (jobId: string, step: StepRecordInput) => Promise<void>;
  /** The notes saved for this part by an earlier attempt of the job, if its input is unchanged. */
  loadPart: (jobId: string, roleId: string, inputHash: string) => Promise<string | null>;
  savePart: (
    input: GenerationPipelineInput,
    roleId: string,
    inputHash: string,
    response: ChatModelResponse,
    notes: string,
  ) => Promise<void>;
  hash: (value: string) => string;
};

type ReadingPlan = {
  input: GenerationPipelineInput;
  reader: ModelRole;
  parts: readonly string[];
  allowance: number;
  window: number;
};

type Progress = { done: number; total: number };

/**
 * Reads a topic that does not fit the models (owner order 2026-11-28). The window is the smallest
 * one of every model that reads the topic later and of the reader; a part is half of it. Each part
 * is one call of the cheapest allowed model, saved like any role reply so a retry does not pay
 * again, and the parts are read three at a time. A part that fails or is skipped for the spend cap
 * leaves a one-line gap marker in the notes; the reading itself never fails the job.
 */
export class TopicReader {
  constructor(private readonly deps: TopicReaderDeps) {}

  /** The input with `topic` replaced by the notes, or the same input when the topic fits. */
  async read(input: GenerationPipelineInput): Promise<GenerationPipelineInput> {
    const topic = input.topic;
    if (topic.length <= TOPIC_HEAD_CHARS * 2) return input;
    const reader = pickBriefRole(input);
    const window = await this.smallestWindow(input, reader);
    const partChars = Math.floor(window * TOPIC_PART_WINDOW_SHARE * TOPIC_CHARS_PER_TOKEN);
    if (topic.length <= partChars) return input;

    const parts = splitTopic(topic, partChars);
    const indexes = pickPartIndexes(parts.length);
    const allowance = Math.max(
      TOPIC_NOTES_MIN_PART_CHARS,
      Math.floor(Math.min(TOPIC_NOTES_TARGET_CHARS, window) / indexes.length),
    );
    const plan: ReadingPlan = { input, reader, parts, allowance, window };
    const progress: Progress = { done: 0, total: indexes.length };
    await this.note(input, 'STARTED', progress);
    const finished: Array<{ slot: number; text: string }> = [];
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < indexes.length) {
        const slot = next;
        next += 1;
        const text = await this.readPart(plan, indexes.at(slot) ?? 0, progress);
        finished.push({ slot, text });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(TOPIC_READING_CONCURRENCY, indexes.length) }, worker),
    );
    const entries = finished.sort((a, b) => a.slot - b.slot).map(({ text }) => text);
    return {
      ...input,
      topic: buildTopicNotes({
        rawTopic: topic,
        entries,
        partCount: parts.length,
        readCount: indexes.length,
      }),
    };
  }

  private async smallestWindow(input: GenerationPipelineInput, reader: ModelRole): Promise<number> {
    const roles = [reader, ...input.authors, input.judge, input.critic];
    const unique = new Map(roles.map((role) => [`${role.provider}/${role.model}`, role]));
    const windows = await Promise.all(
      [...unique.values()].map((role) =>
        this.deps.windowTokens(role.provider, role.model).catch(() => null),
      ),
    );
    return Math.min(...windows.map((tokens) => tokens ?? THREADS_ASSUMED_WINDOW_TOKENS));
  }

  private async readPart(plan: ReadingPlan, index: number, progress: Progress): Promise<string> {
    const { input, parts } = plan;
    const label = `Part ${String(index + 1)} of ${String(parts.length)}`;
    let notes: string | null = null;
    let gap = TOPIC_GAP_UNREADABLE;
    try {
      if (await this.overBudget(input)) {
        gap = TOPIC_GAP_SPEND;
      } else {
        notes = await this.noteOfPart(plan, index);
      }
    } catch (error: unknown) {
      if (isCancellation(error, input)) throw error;
    }
    progress.done += 1;
    await this.note(input, notes === null ? 'SKIPPED' : 'SUCCEEDED', {
      ...progress,
      ...(notes === null ? { part: index + 1 } : {}),
    });
    return notes === null ? `[${label} ${gap}.]` : `${label}:\n${notes}`;
  }

  private async noteOfPart(plan: ReadingPlan, index: number): Promise<string> {
    const { input, reader, parts, allowance, window } = plan;
    const roleKey = `${TOPIC_PART_ROLE_PREFIX}-${String(index + 1)}`;
    const prompt = {
      systemPrompt: buildTopicReaderSystemPrompt(allowance),
      userPrompt: buildTopicReaderUserPrompt(parts.at(index) ?? '', index + 1, parts.length),
    };
    const inputHash = this.deps.hash(`${prompt.systemPrompt}\n${prompt.userPrompt}`);
    const saved = await this.deps.loadPart(input.jobId, roleKey, inputHash);
    if (saved !== null) return saved;
    const wanted =
      Math.ceil(allowance / TOPIC_NOTES_CHARS_PER_OUTPUT_TOKEN) + TOPIC_READER_OUTPUT_SLACK_TOKENS;
    const maxOutputTokens = Math.min(
      Math.max(wanted, TOPIC_READER_MIN_OUTPUT_TOKENS),
      TOPIC_READER_MAX_OUTPUT_TOKENS,
      Math.floor(window / TOPIC_CHARS_PER_TOKEN),
    );
    const response = await this.deps.call(
      { ...input, healing: undefined },
      { jobAttemptsLeft: TOPIC_READER_HEAL_ATTEMPTS, spendCapMicroUsd: null, spentMicroUsd: 0 },
      {
        role: { ...reader, id: roleKey, maxOutputTokens },
        roleKey,
        round: 1,
        prompt,
        accepts: notesSchema,
        shapeHint: TOPIC_READER_REPLY_SHAPE,
      },
    );
    const parsed = notesSchema.parse(parseModelJson(response.content, notesSchema));
    const notes = [...parsed.notes].slice(0, allowance * TOPIC_NOTES_OVERRUN_FACTOR).join('');
    await this.deps.savePart(input, roleKey, inputHash, response, notes);
    return notes;
  }

  private async overBudget(input: GenerationPipelineInput): Promise<boolean> {
    const cap = input.spendCapMicroUsd;
    if (!cap) return false;
    let spent = input.spentMicroUsd ?? 0;
    try {
      spent = (await this.deps.spentMicroUsd(input.jobId)) ?? spent;
    } catch {
      // Best effort: the figure the attempt began with still bounds it.
    }
    return spent * PERCENT >= cap * TOPIC_READER_SPEND_CEILING_PERCENT;
  }

  private note(
    input: GenerationPipelineInput,
    outcome: 'STARTED' | 'SUCCEEDED' | 'SKIPPED',
    excerpt: Progress & { part?: number },
  ): Promise<void> {
    return this.deps
      .record(input.jobId, {
        stage: 'BRIEF',
        roleKind: 'SYSTEM',
        outcome,
        code: TOPIC_READING_CODE,
        rawExcerpt: JSON.stringify(excerpt),
      })
      .catch(() => {});
  }
}
