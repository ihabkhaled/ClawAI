import type { ChatMessage } from '../../../../generated/prisma';
import { groupIntoTurns } from '../conversation-turns.utility';
import { entityOverlap, lexicalOverlap, scoreTurnRelevance } from '../history-relevance.utility';

function turnOf(content: string) {
  const messages = [
    { id: 'u', role: 'USER', content, threadId: 't', createdAt: new Date() },
  ] as unknown as ChatMessage[];
  return groupIntoTurns(messages)[0]!;
}

describe('entityOverlap', () => {
  it('matches a coined identifier the old tokenizer split in half', () => {
    // `ORCHID-731` was stripped to `orchid` + `731`, and `731` was then
    // discarded for being under four characters.
    expect(entityOverlap('The project codename is ORCHID-731.', 'What is ORCHID-731?')).toBe(1);
  });

  it('matches a bare constraint number', () => {
    expect(entityOverlap('Retry exactly 7 times.', 'How many retries? 7?')).toBeGreaterThan(0);
  });

  it('scores zero when the question names no entity', () => {
    expect(entityOverlap('The codename is ORCHID-731.', 'What did we decide?')).toBe(0);
  });
});

describe('lexicalOverlap', () => {
  it('is symmetric in neither direction and normalises by the question', () => {
    expect(lexicalOverlap('alpha beta gamma delta', 'alpha beta')).toBe(1);
    expect(lexicalOverlap('alpha beta', 'alpha beta gamma delta')).toBe(0.5);
  });

  it('returns zero rather than NaN for empty input', () => {
    expect(lexicalOverlap('', 'anything')).toBe(0);
    expect(lexicalOverlap('anything', '')).toBe(0);
  });
});

describe('scoreTurnRelevance', () => {
  it('scores a turn carrying a decision above an equally-worded turn without one', () => {
    const decision = scoreTurnRelevance(
      turnOf('We must always use CockroachDB for the primary database.'),
      'Which database are we using?',
      { newestTurnIndex: 20 },
    );
    const chatter = scoreTurnRelevance(
      turnOf('The database conversation was interesting today.'),
      'Which database are we using?',
      { newestTurnIndex: 20 },
    );

    expect(decision.score).toBeGreaterThan(chatter.score);
    expect(decision.reasons).toContain('decision-marker');
  });

  it('prefers the later of two equally relevant turns', () => {
    const text = 'We will use CockroachDB.';
    const early = scoreTurnRelevance(turnOf(text), 'Which database?', { newestTurnIndex: 100 });
    const late = { ...turnOf(text), index: 90 };
    const lateScore = scoreTurnRelevance(late, 'Which database?', { newestTurnIndex: 100 });

    expect(lateScore.score).toBeGreaterThan(early.score);
  });

  it('scores an empty turn at zero without throwing', () => {
    expect(scoreTurnRelevance(turnOf(''), 'anything', { newestTurnIndex: 1 }).score).toBe(0);
  });
});
