import type { ChatMessage } from '../../../../generated/prisma';
import { resolveModelTokenBudget } from '../../utilities/model-token-budget.utility';
import { ContextComposerManager } from '../context-composer.manager';
import transcripts from './fixtures/live-paraphrase-transcripts.json';

/**
 * Replay of 24 real production threads.
 *
 * These are not synthetic. Each is a live thread run against claw-ai.co on
 * 2026-08-30 by `scripts/qa-lab/paraphrase-experiment.mjs`: one planted fact
 * (`VERDIGRIS-4417`), eight unrelated filler turns, then the same question in
 * one of four phrasings, across six PAYG-exempt models. `recalledLive` on each
 * fixture is what production actually answered.
 *
 * The live result was 83% recall for the phrasing that shared four words with
 * the seeding sentence and 0% for the other three phrasings of the same
 * question about the same fact at the same distance.
 *
 * This spec asserts the mechanism is gone: the composer must put the seeding
 * message in front of the model for ALL 24 threads, including the 18 where
 * production did not.
 *
 * It replays the SELECTION, not the generation. It proves the model is now
 * given the fact; whether a given model then uses it is a model-quality
 * question, measured separately by the lab.
 */

type FixtureThread = {
  threadId: string;
  model: string;
  phrasing: string;
  recalledLive: boolean;
  messages: Array<{ id: string; role: string; content: string }>;
};

const THREADS = transcripts as unknown as FixtureThread[];

/** Reproduces the shipped selector exactly, to quantify the delta. */
const LEGACY_IGNORED = new Set([
  'associate',
  'senior',
  'lead',
  'principal',
  'engineer',
  'advisor',
  'director',
  'manager',
  'analyst',
  'strategist',
  'consultant',
  'support',
  'backend',
  'frontend',
  'product',
  'customer',
  'security',
  'operations',
  'research',
  'scientist',
  'architect',
  'designer',
  'artist',
  'legal',
  'medical',
  'finance',
  'procurement',
  'executive',
]);

function legacyTokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !LEGACY_IGNORED.has(token));
}

function legacyOverlap(a: string, b: string): number {
  const left = new Set(legacyTokenize(a));
  const right = new Set(legacyTokenize(b));
  if (left.size === 0 || right.size === 0) return 0;
  let hits = 0;
  for (const token of left) if (right.has(token)) hits += 1;
  return hits / Math.max(Math.min(left.size, right.size), 1);
}

function legacyIsFollowUp(prompt: string): boolean {
  return /(^|\b)(again|another|one more|continue|expand|shorter|longer|rewrite|rephrase|summarize that|fix that|use that|based on that|from above|previous|earlier|same answer|same style)(\b|$)/.test(
    prompt.trim().toLowerCase(),
  );
}

/** What the shipped code would send, given the same transcript. */
function legacySelect(messages: FixtureThread['messages']): FixtureThread['messages'] {
  const windowed = messages.slice(-20);
  const conversation = windowed.filter((m) => m.role !== 'TOOL');
  if (conversation.length <= 2) return conversation;
  const intent = [...conversation].reverse().find((m) => m.role === 'USER')?.content ?? '';
  if (legacyIsFollowUp(intent)) return conversation.slice(-6);
  const lastUser = [...conversation].reverse().find((m) => m.role === 'USER');
  const selected = conversation.filter((m) => {
    if (m.id === lastUser?.id) return true;
    if (m.role === 'SYSTEM') return true;
    if (m.role === 'ASSISTANT') return false;
    return legacyOverlap(m.content, intent) >= 0.45;
  });
  return selected.length > 0 ? selected.slice(-4) : conversation.slice(-1);
}

function toChatMessages(rows: FixtureThread['messages']): ChatMessage[] {
  return rows.map(
    (row) =>
      ({
        id: row.id,
        threadId: 'replay',
        role: row.role,
        content: row.content,
        createdAt: new Date(),
      }) as unknown as ChatMessage,
  );
}

const SEED_PATTERN = /VERDIGRIS-4417/;

describe('ContextComposerManager — replay of 24 live production threads', () => {
  const composer = new ContextComposerManager();
  const budget = resolveModelTokenBudget({
    contextWindowTokens: 128_000,
    provider: 'OLLAMA',
    requestedOutputTokens: 4096,
    systemOverheadTokens: 0,
    toolOverheadTokens: 0,
  });

  it('captured all four phrasings across six models', () => {
    expect(THREADS).toHaveLength(24);
    expect(new Set(THREADS.map((t) => t.phrasing)).size).toBe(4);
    expect(new Set(THREADS.map((t) => t.model)).size).toBe(6);
  });

  it.each(THREADS.map((t) => [`${t.model} / ${t.phrasing}`, t] as const))(
    'puts the planted fact in front of the model for %s',
    (_label, thread) => {
      const { included } = composer.select(toChatMessages(thread.messages), budget);
      const seedIsPresent = included.some((m) => SEED_PATTERN.test(m.content ?? ''));

      expect(seedIsPresent).toBe(true);
    },
  );

  it('recovers the fact for every thread the shipped selector starved', () => {
    const starved = THREADS.filter(
      (thread) => !legacySelect(thread.messages).some((m) => SEED_PATTERN.test(m.content)),
    );
    expect(starved.length).toBe(18);

    const recovered = starved.filter((thread) =>
      composer
        .select(toChatMessages(thread.messages), budget)
        .included.some((m) => SEED_PATTERN.test(m.content ?? '')),
    );

    expect(recovered).toHaveLength(starved.length);
  });

  it('separates context failure from model refusal in the live results', () => {
    // 19 of 24 threads lost the fact in production, but only 18 were starved of
    // it. The 19th was handed the fact and declined to answer anyway
    // (gpt-oss:120b: "I'm sorry, but I can't comply with that"). Keeping this
    // distinction explicit stops the composer being credited with, or blamed
    // for, model behaviour it does not control.
    const lostLive = THREADS.filter((t) => !t.recalledLive);
    const starvedAndLost = lostLive.filter(
      (thread) => !legacySelect(thread.messages).some((m) => SEED_PATTERN.test(m.content)),
    );
    const refusedDespiteHavingIt = lostLive.length - starvedAndLost.length;

    expect(lostLive).toHaveLength(19);
    expect(starvedAndLost).toHaveLength(18);
    expect(refusedDespiteHavingIt).toBe(1);
  });

  it('sends materially more of the thread than the shipped selector did', () => {
    for (const thread of THREADS) {
      const legacy = legacySelect(thread.messages);
      const { included } = composer.select(toChatMessages(thread.messages), budget);

      expect(included.length).toBe(thread.messages.length);
      expect(included.length).toBeGreaterThan(legacy.length);
    }
  });

  it('reproduces the live outcome from the legacy selector, confirming the diagnosis', () => {
    // If the legacy selector is the cause, then "the legacy selector kept the
    // seed" should predict "production recalled the fact". This asserts the
    // causal chain rather than assuming it.
    for (const thread of THREADS) {
      const legacyHadSeed = legacySelect(thread.messages).some((m) => SEED_PATTERN.test(m.content));
      if (!legacyHadSeed) {
        expect(thread.recalledLive).toBe(false);
      }
    }
  });
});
