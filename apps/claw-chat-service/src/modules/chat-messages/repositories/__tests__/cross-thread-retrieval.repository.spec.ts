import { type Mock, vi } from 'vitest';
import { CrossThreadRetrievalRepository } from '../cross-thread-retrieval.repository';
import { CROSS_THREAD_SCAN_PER_TERM } from '../../constants/cross-thread-retrieval.constants';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

type Hit = { threadId: string; thread: { title: string | null; updatedAt: Date } };

const hit = (threadId: string): Hit => ({
  threadId,
  thread: { title: null, updatedAt: new Date('2026-09-20T00:00:00.000Z') },
});

const scoreOf = (
  rows: readonly { threadId: string; termRarity: number }[],
  threadId: string,
): number => rows.find((row) => row.threadId === threadId)?.termRarity ?? 0;

function repositoryFor(byTerm: Record<string, Hit[]>): {
  repository: CrossThreadRetrievalRepository;
  findMany: Mock;
} {
  const findMany = vi.fn(async (query: { where: { content: { contains: string } } }) =>
    (byTerm[query.where.content.contains] ?? []).slice(0, CROSS_THREAD_SCAN_PER_TERM),
  );
  const prisma = { chatMessage: { findMany } } as unknown as PrismaService;
  return { repository: new CrossThreadRetrievalRepository(prisma), findMany };
}

/**
 * The candidate scan used to be one `OR` query under a single cap, and the cap
 * was the defect. A word the account says constantly filled the whole window,
 * and because the window is ordered by recency, the rare word that identifies
 * the right conversation was evicted by the common word that identifies none.
 * Measured live as `10 candidates from 200 hits`, with the answering thread
 * absent from all ten.
 */
describe('CrossThreadRetrievalRepository.findCandidateThreads', () => {
  it('gives every term its own slice, so a common term cannot evict a rare one', async () => {
    // `workspace` matches everything the account did lately; `peregrine`
    // matches one message, in the one thread that holds the answer.
    const flood = Array.from({ length: CROSS_THREAD_SCAN_PER_TERM * 5 }, (_, index) =>
      hit(`noise-${String(index)}`),
    );
    const { repository, findMany } = repositoryFor({
      workspace: flood,
      peregrine: [hit('answer')],
    });

    const candidates = await repository.findCandidateThreads('user-1', 'current', [
      'workspace',
      'peregrine',
    ]);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(candidates.map((candidate) => candidate.threadId)).toContain('answer');
  });

  it('scores a rare term far above a common one spread across the account', async () => {
    // The live geometry: a word used constantly appears in many different
    // threads, so no single thread accumulates much from it.
    const spread = Array.from({ length: CROSS_THREAD_SCAN_PER_TERM }, (_, index) =>
      hit(`noise-${String(index)}`),
    );
    const { repository } = repositoryFor({ workspace: spread, peregrine: [hit('answer')] });

    const rows = await repository.findCandidateThreads('user-1', 'current', [
      'workspace',
      'peregrine',
    ]);

    // The common term saturated its slice, so it is worth the floor. A hit on
    // a term that matched once in the whole history is worth far more.
    expect(scoreOf(rows, 'answer')).toBeGreaterThan(scoreOf(rows, 'noise-0'));
  });

  it('weights a term by how rare it is, continuously', async () => {
    // A binary rare/common split cannot separate a word used twice in the
    // account from one used thirty times, and that is exactly the distinction
    // that matters: the first names one conversation, the second is this
    // question's own phrasing.
    const many = Array.from({ length: 30 }, () => hit('ordinary'));
    const { repository } = repositoryFor({ inventing: many, ruzeru: [hit('answer')] });

    const rows = await repository.findCandidateThreads('user-1', 'current', [
      'inventing',
      'ruzeru',
    ]);

    expect(scoreOf(rows, 'answer')).toBeGreaterThan(scoreOf(rows, 'ordinary'));
  });

  it('ranks on the rarest term matched, not on how many terms matched', async () => {
    // The shape that failed live, with its real numbers. Asked for a `ruzeru`
    // cohort codename: `ruzeru` appeared in 2 messages in the whole account,
    // and `inventing` in 32 — so `inventing` looked rare too, and it occurs
    // nowhere but in this question's own phrasing, "instead of inventing one".
    // Every previous asking of the question therefore matched eight terms and
    // outranked the one conversation that stated the answer, which matched
    // one. Summing cannot fix this: the corpus that rarity is measured against
    // CONTAINS the question.
    const askedBefore = Array.from({ length: 32 }, () => hit('asked-before'));
    const common = Object.fromEntries(
      ['conversation', 'containing', 'genuinely', 'operation', 'workspace', 'codename'].map(
        (term) => [
          term,
          Array.from({ length: CROSS_THREAD_SCAN_PER_TERM }, () => hit('asked-before')),
        ],
      ),
    );
    const { repository } = repositoryFor({
      ...common,
      inventing: askedBefore,
      ruzeru: [hit('answer')],
      cohort: Array.from({ length: CROSS_THREAD_SCAN_PER_TERM }, () => hit('answer')),
    });

    const rows = await repository.findCandidateThreads('user-1', 'current', [
      ...Object.keys(common),
      'inventing',
      'ruzeru',
      'cohort',
    ]);

    expect(scoreOf(rows, 'answer')).toBeGreaterThan(scoreOf(rows, 'asked-before'));
  });

  it('scopes every slice to the user, excluding the current and archived threads', async () => {
    const { repository, findMany } = repositoryFor({});

    await repository.findCandidateThreads('user-1', 'current', ['peregrine']);

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { thread: { userId: 'user-1', isArchived: false, id: { not: 'current' } } },
    });
  });

  it('asks the database nothing when there are no terms', async () => {
    const { repository, findMany } = repositoryFor({});

    expect(await repository.findCandidateThreads('user-1', 'current', [])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
