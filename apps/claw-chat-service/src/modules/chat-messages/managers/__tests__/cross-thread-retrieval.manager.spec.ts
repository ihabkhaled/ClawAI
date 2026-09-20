import { type CrossThreadRetrievalRepository } from '../../repositories/cross-thread-retrieval.repository';
import {
  type CrossThreadCandidate,
  type CrossThreadMessageRow,
  CrossThreadSkipReason,
} from '../../types/cross-thread-retrieval.types';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

/**
 * Cross-thread retrieval is the one context source that reads material the user
 * did not put in front of the model themselves. Its tests are therefore mostly
 * about what it REFUSES to do.
 */

type RecordedCall = { userId: string; arg: unknown; terms?: string[] };

function repositoryWith(options: {
  candidates?: CrossThreadCandidate[];
  messages?: CrossThreadMessageRow[];
  throwOnCandidates?: boolean;
}): { repo: CrossThreadRetrievalRepository; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const repo = {
    findCandidateThreads: async (
      userId: string,
      excludeThreadId: string,
      terms: readonly string[],
    ) => {
      calls.push({ userId, arg: excludeThreadId, terms: [...terms] });
      if (options.throwOnCandidates === true) throw new Error('db exploded');
      return Promise.resolve(options.candidates ?? []);
    },
    findMessagesForThreads: async (userId: string, threadIds: readonly string[]) => {
      calls.push({ userId, arg: [...threadIds] });
      return Promise.resolve(options.messages ?? []);
    },
  } as unknown as CrossThreadRetrievalRepository;
  return { repo, calls };
}

function candidate(threadId: string, title: string | null, termRarity = 3): CrossThreadCandidate {
  return {
    threadId,
    title,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    termRarity,
  };
}

function messageRow(
  messageId: string,
  threadId: string,
  content: string,
  title = 'Project ORCHID-731 architecture',
  createdAt = new Date('2026-08-01T00:00:00Z'),
): CrossThreadMessageRow {
  return {
    messageId,
    threadId,
    threadTitle: title,
    role: 'USER',
    content,
    createdAt,
  };
}

const BASE = {
  userId: 'user-1',
  currentThreadId: 'thread-current',
  availableInputTokens: 40_000,
};

describe('CrossThreadRetrievalManager', () => {
  describe('what it refuses to do', () => {
    it('does nothing at all when the thread has not opted in', async () => {
      const { repo, calls } = repositoryWith({
        candidates: [candidate('t-old', 'Project ORCHID-731 architecture')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: false,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(result.selections).toEqual([]);
      expect(result.skippedReason).toBe(CrossThreadSkipReason.DISABLED);
      // The database is never touched. Opt-out has to mean "not read", not
      // "read and then discarded" — the second still exposes the data to a bug.
      expect(calls).toHaveLength(0);
    });

    it('does not retrieve on a prompt with too little to match on', async () => {
      const { repo, calls } = repositoryWith({ candidates: [candidate('t-old', 'ORCHID-731')] });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({ ...BASE, enabled: true, intent: 'ok thanks' });

      expect(result.skippedReason).toBe(CrossThreadSkipReason.INTENT_TOO_SHORT);
      expect(calls).toHaveLength(0);
    });

    it('searches on the coined identifier alone when the prompt carries one', async () => {
      // The precision gate. Searching the other terms too would match every
      // thread that ever mentioned a package manager.
      const { repo, calls } = repositoryWith({
        candidates: [candidate('t-1', 'Project MERIDIAN-88')],
        messages: [messageRow('m-1', 't-1', 'MERIDIAN-88 standardised on pnpm.')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the MERIDIAN-88 project. Which package manager did we standardise on?',
      });

      expect(calls[0]?.terms).toEqual(['MERIDIAN-88']);
    });

    it('imports nothing when no thread mentions the prompt at all', async () => {
      const { repo } = repositoryWith({ candidates: [] });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'What is the capital city of Portugal and what is it known for?',
      });

      expect(result.selections).toEqual([]);
      expect(result.skippedReason).toBe(CrossThreadSkipReason.NO_CANDIDATES);
    });

    it('returns nothing rather than failing the turn when the read throws', async () => {
      const { repo } = repositoryWith({ throwOnCandidates: true });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(result.skippedReason).toBe(CrossThreadSkipReason.RETRIEVAL_FAILED);
      expect(result.selections).toEqual([]);
    });

    it('takes no cross-thread material when the budget leaves no room', async () => {
      const { repo } = repositoryWith({
        candidates: [candidate('t-1', 'Project ORCHID-731 architecture')],
        messages: [messageRow('m-1', 't-1', 'ORCHID-731 uses CockroachDB.')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        availableInputTokens: 0,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(result.skippedReason).toBe(CrossThreadSkipReason.NO_BUDGET);
    });
  });

  describe('ownership', () => {
    it('passes the caller userId to every read', async () => {
      const { repo, calls } = repositoryWith({
        candidates: [candidate('t-1', 'Project ORCHID-731 architecture')],
        messages: [messageRow('m-1', 't-1', 'For ORCHID-731 we chose CockroachDB.')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) expect(call.userId).toBe('user-1');
    });

    it('excludes the current thread from the candidate search', async () => {
      const { repo, calls } = repositoryWith({ candidates: [] });
      const manager = new CrossThreadRetrievalManager(repo);

      await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(calls[0]?.arg).toBe('thread-current');
    });
  });

  describe('what it does retrieve', () => {
    it('finds the right previous project by its coined name', async () => {
      const { repo } = repositoryWith({
        candidates: [
          candidate('t-orchid', 'Project ORCHID-731 architecture'),
          candidate('t-other', 'Holiday planning'),
        ],
        messages: [
          messageRow('m-1', 't-orchid', 'For ORCHID-731 the primary database is CockroachDB.'),
          messageRow('m-2', 't-orchid', 'Unrelated chatter about lunch.'),
        ],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the ORCHID-731 project. Which database did we choose?',
      });

      expect(result.skippedReason).toBeNull();
      expect(result.usedThreadIds).toEqual(['t-orchid']);
      expect(result.selections.map((s) => s.messageId)).toContain('m-1');
      expect(result.selections.map((s) => s.messageId)).not.toContain('m-2');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('records a score and a reason for everything it selected', async () => {
      const { repo } = repositoryWith({
        candidates: [candidate('t-orchid', 'Project ORCHID-731 architecture')],
        messages: [messageRow('m-1', 't-orchid', 'ORCHID-731 stores timestamps in UTC only.')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'For ORCHID-731, how are timestamps stored?',
      });

      for (const selection of result.selections) {
        expect(selection.score).toBeGreaterThan(0);
        expect(selection.reasons.length).toBeGreaterThan(0);
        expect(selection.threadTitle).toBe('Project ORCHID-731 architecture');
      }
    });

    it('reports the threads it searched even when none of them contributed', async () => {
      const { repo } = repositoryWith({
        candidates: [candidate('t-orchid', 'Project ORCHID-731 architecture')],
        messages: [messageRow('m-1', 't-orchid', 'Completely unrelated sentence.')],
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      expect(result.searchedThreadIds).toEqual(['t-orchid']);
      expect(result.usedThreadIds).toEqual([]);
      expect(result.skippedReason).toBe(CrossThreadSkipReason.NO_RELEVANT_MESSAGE);
    });

    it('never spends more than its share of the input budget', async () => {
      const long = 'ORCHID-731 '.repeat(400);
      const { repo } = repositoryWith({
        candidates: [candidate('t-orchid', 'Project ORCHID-731 architecture')],
        messages: Array.from({ length: 20 }, (_, i) =>
          messageRow(`m-${String(i)}`, 't-orchid', long),
        ),
      });
      const manager = new CrossThreadRetrievalManager(repo);

      const result = await manager.retrieve({
        ...BASE,
        enabled: true,
        availableInputTokens: 10_000,
        intent: 'Continue the ORCHID-731 project we discussed earlier.',
      });

      // 15% of 10,000.
      expect(result.estimatedTokens).toBeLessThanOrEqual(1500);
    });
  });
});

describe('CrossThreadRetrievalManager — recency and isolation', () => {
  const INTENT = 'what did we decide about Project ORCHID-731 architecture';

  it('reads only the requesting user, in both queries', async () => {
    // The privacy boundary is the USER, not the thread. Two filters rather
    // than one because the thread ids reach the second query as an array from
    // a caller, and a caller is exactly where a bug can substitute an id.
    const { repo, calls } = repositoryWith({
      candidates: [candidate('t-old', 'Project ORCHID-731 architecture')],
      messages: [messageRow('m1', 't-old', 'Project ORCHID-731 architecture uses a queue')],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    await manager.retrieve({ ...BASE, enabled: true, intent: INTENT });

    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      expect(call.userId).toBe('user-1');
    }
  });

  it('keeps the newest messages when the pack is full', async () => {
    // A relevance-ranked fill could spend the whole ceiling on old-but-wordy
    // matches and drop last week's conversation on the same subject.
    const older = messageRow(
      'old',
      't-old',
      `Project ORCHID-731 architecture ${'old '.repeat(400)}`,
      undefined,
      new Date('2026-01-01T00:00:00Z'),
    );
    const newer = messageRow(
      'new',
      't-old',
      'Project ORCHID-731 architecture was changed last week',
      undefined,
      new Date('2026-09-01T00:00:00Z'),
    );
    const { repo } = repositoryWith({
      candidates: [candidate('t-old', 'Project ORCHID-731 architecture')],
      messages: [older, newer],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({
      ...BASE,
      enabled: true,
      intent: INTENT,
      availableInputTokens: 900,
    });

    expect(result.selections.map((entry) => entry.messageId)).toContain('new');
  });

  it('orders what it returns newest first', async () => {
    const { repo } = repositoryWith({
      candidates: [candidate('t-old', 'Project ORCHID-731 architecture')],
      messages: [
        messageRow(
          'a',
          't-old',
          'Project ORCHID-731 architecture note A',
          undefined,
          new Date('2026-02-01T00:00:00Z'),
        ),
        messageRow(
          'c',
          't-old',
          'Project ORCHID-731 architecture note C',
          undefined,
          new Date('2026-09-01T00:00:00Z'),
        ),
        messageRow(
          'b',
          't-old',
          'Project ORCHID-731 architecture note B',
          undefined,
          new Date('2026-05-01T00:00:00Z'),
        ),
      ],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({ ...BASE, enabled: true, intent: INTENT });

    expect(result.selections.map((entry) => entry.messageId)).toEqual(['c', 'b', 'a']);
  });
});

/**
 * A fact stated once, minutes ago.
 *
 * `evidence` counts matching MESSAGES, so a thread that records a fact the way
 * people actually record one — say it, get an acknowledgement, move on — has
 * almost none, and scored below the threshold. A long, rambling, older thread
 * on the same subject outranked it. A live round reproduced this every time:
 * the model was told a codename in one conversation and, asked for it in the
 * next, either said it did not have it or invented one.
 */
describe('CrossThreadRetrievalManager recency', () => {
  const recent = (minutesAgo: number, termRarity = 1): CrossThreadCandidate => ({
    threadId: 'thread-fact',
    title: 'Round: remembers-another-thread',
    updatedAt: new Date(Date.now() - minutesAgo * 60_000),
    termRarity,
  });

  const retrieve = async (candidates: CrossThreadCandidate[]) => {
    const { repo } = repositoryWith({
      candidates,
      messages: [
        messageRow(
          'message-1',
          'thread-fact',
          'the canary cohort codename is PEREGRINE-7742',
          'Round: remembers-another-thread',
          new Date(),
        ),
      ],
    });
    return new CrossThreadRetrievalManager(repo).retrieve({
      ...BASE,
      enabled: true,
      intent: 'what is the canary cohort codename for releases',
    });
  };

  it('finds a fact stated once in a conversation from minutes ago', async () => {
    const result = await retrieve([recent(5)]);

    expect(result.skippedReason).toBeNull();
    expect(JSON.stringify(result)).toMatch(/PEREGRINE-7742/u);
  });

  it('still finds it when the same thread is a day old', async () => {
    const result = await retrieve([recent(60 * 20)]);

    expect(result.skippedReason).toBeNull();
  });

  it('does not make an unrelated thread relevant by being recent', async () => {
    // The amplification multiplies existing relevance and never adds to it, so
    // a thread nothing matched stays at zero however fresh it is. Otherwise
    // every retrieval would return whatever the user happened to do last.
    const { repo } = repositoryWith({ candidates: [], messages: [] });

    const result = await new CrossThreadRetrievalManager(repo).retrieve({
      ...BASE,
      enabled: true,
      intent: 'what is the canary cohort codename for releases',
    });

    expect(result.skippedReason).toBe(CrossThreadSkipReason.NO_CANDIDATES);
  });

  it('rejects the best candidate when its content does not match after all', async () => {
    // The content look is a second chance, not a free pass. The thread is
    // read, and the message scorer — which the cheap filter could not consult
    // — still refuses text that has nothing to do with the question.
    const { repo } = repositoryWith({
      candidates: [recent(5)],
      messages: [
        messageRow(
          'message-1',
          'thread-fact',
          'the office coffee machine needs descaling',
          'Round: remembers-another-thread',
          new Date(),
        ),
      ],
    });

    const result = await new CrossThreadRetrievalManager(repo).retrieve({
      ...BASE,
      enabled: true,
      intent: 'what is the canary cohort codename for releases',
    });

    expect(result.selections).toEqual([]);
  });
});

/**
 * Message scoring ranks by similarity to the prompt, which makes the prompt
 * itself the highest-scoring message retrieval can find — and the least useful
 * one it can return.
 *
 * Measured live: a user who asks the same question in several conversations
 * accumulates near-identical copies of their own question, and those copies
 * outranked the one thread that held the answer. Retrieval was handing back its
 * own past failures, at the top of the list, paid for out of the answer's
 * budget.
 */
describe('CrossThreadRetrievalManager — a restatement of the prompt is not context', () => {
  const question = 'In an earlier conversation I gave you the canary cohort codename for ClawAI.';

  it('drops a previous conversation that only asked the same question', async () => {
    const { repo } = repositoryWith({
      candidates: [candidate('t-asked', 'Canary cohort')],
      messages: [messageRow('m-asked', 't-asked', question, 'Canary cohort')],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({ ...BASE, enabled: true, intent: question });

    expect(result.selections).toEqual([]);
    expect(result.usedThreadIds).toEqual([]);
  });

  it('keeps a conversation that answers the question', async () => {
    const { repo } = repositoryWith({
      candidates: [candidate('t-answer', 'Canary cohort')],
      messages: [
        messageRow(
          'm-answer',
          't-answer',
          'The canary cohort for ClawAI releases is PEREGRINE-7742.',
          'Canary cohort',
        ),
      ],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({ ...BASE, enabled: true, intent: question });

    expect(result.selections.map((selection) => selection.messageId)).toEqual(['m-answer']);
  });
});

/**
 * The candidate cut moved here from the repository, because it needs recency
 * and recency lives with the scoring.
 *
 * A repository that also ranked was deciding which threads the scorer is
 * allowed to consider, and it decided wrongly in the case that matters: a
 * conversation stating a fact matches a few of a question's words, while every
 * previous asking of that question matches all of them. Term overlap alone
 * cannot separate them; minutes-versus-hours can.
 */
describe('CrossThreadRetrievalManager — recency breaks a near-tie on terms', () => {
  const question = 'In an earlier conversation I gave you the canary cohort codename for ClawAI.';

  function aged(threadId: string, minutesAgo: number, termRarity: number) {
    return {
      threadId,
      title: null,
      updatedAt: new Date(Date.now() - minutesAgo * 60 * 1000),
      termRarity,
    };
  }

  it('reads the recent thread that matched slightly less', async () => {
    const { repo, calls } = repositoryWith({
      // The past asking matches the same rare terms plus the question's filler.
      candidates: [aged('t-asked', 240, 2.06), aged('t-answer', 2, 2)],
      messages: [
        messageRow(
          'm-answer',
          't-answer',
          'The canary cohort for ClawAI releases is PEREGRINE-7742.',
        ),
      ],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({ ...BASE, enabled: true, intent: question });

    expect(calls.at(-1)?.arg).toContain('t-answer');
    expect(result.selections.map((selection) => selection.messageId)).toEqual(['m-answer']);
  });
});

/**
 * Entity overlap carries 60% of a message's resemblance score when the prompt
 * contains a coined identifier, and it answers 0 when the prompt contains
 * none — which is correct, and was being read as "nothing matched".
 *
 * So a question phrased in ordinary words could never score above 0.4 of the
 * scale. Measured live: the message holding the answer scored 0.217 against a
 * 0.22 threshold and was rejected by 0.003, while its thread had already been
 * ranked first of ten.
 */
describe('CrossThreadRetrievalManager — a prompt with no identifier is not penalised', () => {
  it('selects the answer to a question asked in ordinary words', async () => {
    const { repo } = repositoryWith({
      candidates: [candidate('t-answer', null, 1)],
      messages: [
        messageRow(
          'm-answer',
          't-answer',
          'Remember this project fact for later conversations: the shazeka cohort for ClawAI releases is KAVO-7297. Acknowledge only, reply OK.',
          'Shazeka cohort',
        ),
      ],
    });
    const manager = new CrossThreadRetrievalManager(repo);

    const result = await manager.retrieve({
      ...BASE,
      enabled: true,
      intent:
        'In an earlier conversation I gave you the shazeka cohort codename for ClawAI releases. Create COHORT.txt with workspace.file operation "create" containing only that codename. If you genuinely do not have it, write UNKNOWN instead of inventing one. Reply DONE.',
    });

    expect(result.selections.map((selection) => selection.messageId)).toEqual(['m-answer']);
  });
});
