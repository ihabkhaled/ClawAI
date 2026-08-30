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

function candidate(
  threadId: string,
  title: string | null,
  matchingMessageCount = 3,
): CrossThreadCandidate {
  return {
    threadId,
    title,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    matchingMessageCount,
  };
}

function messageRow(
  messageId: string,
  threadId: string,
  content: string,
  title = 'Project ORCHID-731 architecture',
): CrossThreadMessageRow {
  return {
    messageId,
    threadId,
    threadTitle: title,
    role: 'USER',
    content,
    createdAt: new Date('2026-08-01T00:00:00Z'),
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
