import { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { ChatModelResponse } from '../../../models/chat-model.client';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type { RoleCallSpec } from '../../types/healing.types';
import type { StepRecordInput } from '../../types/step-recorder.types';
import { ThreadGenerationCancelledError } from '../../utilities/thread-generation-cancelled.error';
import { TopicReader, type TopicReaderDeps } from '../topic-reader';

const role = (id: string): ModelRole => ({
  id,
  provider: 'P',
  model: `m-${id}`,
  maxOutputTokens: 4096,
  fallbacks: [],
});

function inputWith(topic: string): GenerationPipelineInput {
  return {
    jobId: 'job-1',
    ownerId: 'owner-1',
    budgetId: 'b',
    attempt: 1,
    correlationId: 'c',
    contentLocale: Locale.EN,
    topic,
    publicationType: ThreadPublicationType.ARTICLE,
    sourceSnapshot: {},
    authors: [role('a1')],
    judge: role('judge'),
    critic: role('critic'),
    spendCapMicroUsd: 1_000_000,
    spentMicroUsd: 0,
  };
}

const response = (content: string): ChatModelResponse => ({
  content,
  provider: 'P',
  model: 'M',
  durationMs: 1,
  clamped: false,
  costMicroUsd: 1,
});

/** A topic of numbered 20-character lines, so the parts have clean cut points. */
const topicOf = (chars: number): string =>
  Array.from(
    { length: Math.ceil(chars / 20) },
    (_u, i) => `Line ${String(i).padStart(7, '0')} xxxxx.\n`,
  )
    .join('')
    .slice(0, chars);

function setup(
  options: {
    window?: number | null;
    reply?: (spec: RoleCallSpec) => string | Error;
    spent?: number;
  } = {},
) {
  const specs: RoleCallSpec[] = [];
  const steps: StepRecordInput[] = [];
  const saved = new Map<string, string>();
  let active = 0;
  let peak = 0;
  const deps: TopicReaderDeps = {
    call: vi.fn(async (_input, _budget, spec) => {
      specs.push(spec);
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      const reply = options.reply?.(spec) ?? `{"notes":"notes of ${spec.roleKey}"}`;
      if (reply instanceof Error) throw reply;
      return response(reply);
    }),
    spentMicroUsd: vi.fn(() => Promise.resolve(options.spent ?? 0)),
    windowTokens: vi.fn(() =>
      Promise.resolve(options.window === undefined ? 1_000 : options.window),
    ),
    record: vi.fn((_jobId, step) => {
      steps.push(step);
      return Promise.resolve();
    }),
    loadPart: vi.fn((_jobId, roleId, hash) =>
      Promise.resolve(saved.get(`${roleId}|${hash}`) ?? null),
    ),
    savePart: vi.fn((_input, roleId, hash, _response, notes) => {
      saved.set(`${roleId}|${hash}`, notes);
      return Promise.resolve();
    }),
    hash: (value) => `h${String(value.length)}:${value.slice(-40)}`,
  };
  return { reader: new TopicReader(deps), deps, specs, steps, saved, peak: () => peak };
}

describe('TopicReader', () => {
  it('leaves a topic that fits untouched and calls no model', async () => {
    const { reader, deps } = setup({ window: 32_768 });
    const input = inputWith(topicOf(42_417));
    expect(await reader.read(input)).toBe(input);
    expect(deps.call).not.toHaveBeenCalled();
  });

  it('reads a 200k topic in parts of half the small window and hands the notes on', async () => {
    const { reader, specs, steps, peak } = setup({ window: 8_000 });
    const topic = topicOf(200_000);
    const read = await reader.read(inputWith(topic));
    // 8,000 tokens: half is 4,000 tokens = 16,000 characters per part, so 13 parts.
    expect(specs).toHaveLength(13);
    expect(peak()).toBeLessThanOrEqual(3);
    expect(read.topic.startsWith(topic.slice(0, 2_000))).toBe(true);
    expect(read.topic).toContain('Part 1 of 13:\nnotes of topic-part-1');
    expect(read.topic).toContain('Part 13 of 13:\nnotes of topic-part-13');
    expect(read.topic.length).toBeLessThan(40_000);
    const progress = steps.filter((step) => step.code === 'TOPIC_READING');
    expect(progress[0]?.outcome).toBe('STARTED');
    expect(JSON.parse(progress.at(-1)?.rawExcerpt ?? '{}')).toEqual({ done: 13, total: 13 });
  });

  it('uses the smallest window among the reader and every role', async () => {
    const { reader, deps, specs } = setup();
    vi.mocked(deps.windowTokens).mockImplementation((_provider, model) =>
      Promise.resolve(model === 'm-judge' ? 2_000 : 100_000),
    );
    await reader.read(inputWith(topicOf(20_000)));
    // 2,000 tokens: half is 4,000 characters per part.
    expect(specs.length).toBeGreaterThanOrEqual(5);
  });

  it('assumes 32,768 tokens for a model with no known window', async () => {
    const { reader, specs } = setup({ window: null });
    await reader.read(inputWith(topicOf(140_000)));
    // Half of 32,768 tokens is 65,536 characters: 3 parts.
    expect(specs).toHaveLength(3);
  });

  it('samples evenly above 400 parts and says so in the notes', async () => {
    const { reader, specs } = setup({ window: 1_000 });
    const read = await reader.read(inputWith(topicOf(1_000_000)));
    expect(specs).toHaveLength(400);
    expect(read.topic).toContain('only 400 of its 500 parts');
    expect(read.topic).toContain('Part 500 of 500:');
  });

  it('keeps a one-line gap marker for a part that fails and goes on', async () => {
    const { reader, steps } = setup({
      window: 8_000,
      reply: (spec) => (spec.roleKey === 'topic-part-2' ? new Error('boom') : '{"notes":"ok"}'),
    });
    const read = await reader.read(inputWith(topicOf(40_000)));
    expect(read.topic).toContain('[Part 2 of 3 could not be read.]');
    expect(read.topic).toContain('Part 3 of 3:\nok');
    expect(steps.some((step) => step.outcome === 'SKIPPED' && step.code === 'TOPIC_READING')).toBe(
      true,
    );
  });

  it('skips the parts left once the spend ceiling is reached', async () => {
    const { reader, deps } = setup({ window: 8_000, spent: 900_000 });
    const read = await reader.read(inputWith(topicOf(40_000)));
    expect(deps.call).not.toHaveBeenCalled();
    expect(read.topic).toContain('[Part 1 of 3 was not read to stay under the spend cap.]');
  });

  it('does not pay again for a part saved by an earlier attempt', async () => {
    const first = setup({ window: 8_000 });
    const input = inputWith(topicOf(40_000));
    await first.reader.read(input);
    const second = setup({ window: 8_000 });
    for (const [key, notes] of first.saved) second.saved.set(key, notes);
    const read = await second.reader.read(input);
    expect(second.deps.call).not.toHaveBeenCalled();
    expect(read.topic).toContain('Part 1 of 3:\nnotes of topic-part-1');
  });

  it('lets a cancellation through instead of writing a gap', async () => {
    const { reader } = setup({ window: 8_000, reply: () => new ThreadGenerationCancelledError() });
    await expect(reader.read(inputWith(topicOf(40_000)))).rejects.toBeInstanceOf(
      ThreadGenerationCancelledError,
    );
  });
});
