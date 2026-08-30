import type { ChatMessage } from '../../../../generated/prisma';
import { ContextOmissionReason } from '../../enums/context-omission-reason.enum';
import { type ModelTokenBudget } from '../../types/context-composer.types';
import { resolveModelTokenBudget } from '../../utilities/model-token-budget.utility';
import { ContextComposerManager } from '../context-composer.manager';

/**
 * Every case in this file is a measured production failure, not a hypothesis.
 *
 * The live lab (`scripts/qa-lab`) ran the same planted fact at the same
 * distance against six free models with four phrasings of the same question and
 * measured 83% recall for the phrasing that shared four words with the seeding
 * sentence and 0% for the other three. These tests pin the mechanism that
 * produced that gap so it cannot come back.
 */

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role,
    content,
    provider: null,
    model: null,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    estimatedCost: null,
    latencyMs: null,
    feedback: null,
    metadata: null,
    createdAt: new Date(),
  } as unknown as ChatMessage;
}

/** A transcript of `pairs` complete user/assistant turns on unrelated topics. */
function transcript(pairs: number, prefix = 'filler'): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let index = 0; index < pairs; index += 1) {
    out.push(
      message(`${prefix}-u-${String(index)}`, 'USER', `Unrelated question ${String(index)}`),
    );
    out.push(
      message(`${prefix}-a-${String(index)}`, 'ASSISTANT', `Unrelated answer ${String(index)}`),
    );
  }
  return out;
}

function budget(contextWindowTokens: number): ModelTokenBudget {
  return resolveModelTokenBudget({
    contextWindowTokens,
    provider: 'OLLAMA',
    requestedOutputTokens: 4096,
    systemOverheadTokens: 0,
    toolOverheadTokens: 0,
  });
}

describe('ContextComposerManager', () => {
  const composer = new ContextComposerManager();

  describe('the regressions it exists to prevent', () => {
    it('keeps a planted fact when the question shares no vocabulary with it', () => {
      // The exact live failure: overlap 0.00 against a 0.45 gate, so the seed
      // was dropped and the model answered "I don't have any record of a
      // previous conversation".
      const messages = [
        message('seed', 'USER', 'My access code for this session is VERDIGRIS-4417.'),
        message('seed-a', 'ASSISTANT', 'Noted.'),
        ...transcript(8),
        message('probe', 'USER', 'Which secret string did I share at the start?'),
      ];

      const { included } = composer.select(messages, budget(128_000));

      expect(included.map((m) => m.id)).toContain('seed');
    });

    it('keeps assistant messages, which were previously dropped for their role alone', () => {
      const messages = [
        message('u1', 'USER', 'Give me three queue options named Alpha, Beta and Gamma.'),
        message('a1', 'ASSISTANT', 'Alpha: at-least-once. Beta: exactly-once. Gamma: best effort.'),
        message('u2', 'USER', 'Pick the most reliable.'),
        message('a2', 'ASSISTANT', 'Beta, because it deduplicates on the broker.'),
        ...transcript(4),
        message('probe', 'USER', 'Implement it.'),
      ];

      const { included } = composer.select(messages, budget(128_000));

      expect(included.map((m) => m.id)).toEqual(expect.arrayContaining(['a1', 'a2']));
    });

    it.each([
      'build it',
      'implement it',
      'use option 3',
      'make the backend now',
      'what did you recommend before?',
      'turn your architecture into code',
      'finish what we discussed',
      'create the final version',
      'Build the complete design using every decision and constraint we agreed on.',
    ])('sends history for the referring prompt %p', (prompt) => {
      const messages = [
        message('early', 'USER', 'The project codename is ORCHID-731.'),
        message('early-a', 'ASSISTANT', 'Acknowledged.'),
        ...transcript(6),
        message('probe', 'USER', prompt),
      ];

      const { included } = composer.select(messages, budget(128_000));

      // Every one of these prompts returned `false` from the old
      // `isLikelyFollowUp`, which then removed all assistant turns and cut the
      // remainder to four messages.
      expect(included.length).toBeGreaterThan(4);
      expect(included.map((m) => m.id)).toContain('early');
    });

    it('sends the whole conversation when it fits the window', () => {
      const messages = [...transcript(30), message('probe', 'USER', 'Summarise this thread.')];

      const { included, manifest } = composer.select(messages, budget(128_000));

      expect(included).toHaveLength(messages.length);
      expect(manifest.omitted).toHaveLength(0);
    });

    it('does not cap history at twenty messages', () => {
      const messages = [...transcript(40), message('probe', 'USER', 'And finally?')];

      const { included } = composer.select(messages, budget(128_000));

      expect(included.length).toBeGreaterThan(20);
    });
  });

  describe('turn integrity', () => {
    it('never includes an assistant answer without its question', () => {
      const messages = [...transcript(40), message('probe', 'USER', 'Now what?')];

      const { included } = composer.select(messages, budget(8192));
      const includedIds = new Set(included.map((m) => m.id));

      for (const included_ of included) {
        if (included_.role !== 'ASSISTANT') continue;
        const pairIndex = included_.id.replace('filler-a-', '');
        expect(includedIds.has(`filler-u-${pairIndex}`)).toBe(true);
      }
    });

    it('always includes the current prompt, even when it alone exceeds the budget', () => {
      const huge = 'x'.repeat(200_000);
      const messages = [...transcript(5), message('probe', 'USER', huge)];

      const { included } = composer.select(messages, budget(8192));

      expect(included.map((m) => m.id)).toContain('probe');
    });
  });

  describe('budget accounting', () => {
    it('omits under budget pressure and records the reason per message', () => {
      const long = 'word '.repeat(400);
      const messages = [
        ...Array.from({ length: 30 }, (_, i) => [
          message(`u${String(i)}`, 'USER', long),
          message(`a${String(i)}`, 'ASSISTANT', long),
        ]).flat(),
        message('probe', 'USER', 'And finally?'),
      ];

      const { manifest } = composer.select(messages, budget(8192));

      expect(manifest.omitted.length).toBeGreaterThan(0);
      for (const omitted of manifest.omitted) {
        expect([
          ContextOmissionReason.TOKEN_BUDGET_EXHAUSTED,
          ContextOmissionReason.LOW_RELEVANCE,
        ]).toContain(omitted.reason);
      }
      expect(manifest.warnings.join(' ')).toContain('TURNS_OMITTED');
    });

    it('records what assembly cost, split by where the time went', () => {
      const messages = [...transcript(10), message('probe', 'USER', 'Done?')];

      const { manifest } = composer.select(messages, budget(128_000), { retrievalMs: 42 });

      // Retrieval is passed in by the assembler; selection is measured here.
      // Keeping them apart is what makes "context assembly got slower"
      // distinguishable from "memory-service got slower".
      expect(manifest.retrievalMs).toBe(42);
      expect(manifest.selectionMs).toBeGreaterThanOrEqual(0);
    });

    it('reports zero retrieval time when the caller measured none', () => {
      const { manifest } = composer.select([], budget(128_000));

      expect(manifest.retrievalMs).toBe(0);
      expect(manifest.selectionMs).toBeGreaterThanOrEqual(0);
    });

    it('reports what it included against what the thread holds', () => {
      const messages = [...transcript(10), message('probe', 'USER', 'Done?')];

      const { manifest } = composer.select(messages, budget(128_000));

      expect(manifest.totalThreadMessages).toBe(messages.length);
      expect(manifest.includedMessageIds).toHaveLength(messages.length);
      expect(manifest.estimatedInputTokens).toBeGreaterThan(0);
      expect(manifest.budget.contextWindowTokens).toBe(128_000);
    });
  });

  describe('degenerate input', () => {
    it('returns nothing for an empty thread without throwing', () => {
      const { included, manifest } = composer.select([], budget(128_000));

      expect(included).toEqual([]);
      expect(manifest.includedTurnCount).toBe(0);
    });

    it('handles a thread that opens with an assistant message', () => {
      const messages = [message('a0', 'ASSISTANT', 'Welcome.'), message('u0', 'USER', 'Hello.')];

      const { included } = composer.select(messages, budget(128_000));

      expect(included.map((m) => m.id)).toEqual(['a0', 'u0']);
    });
  });
});
