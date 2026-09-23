import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompareJudgeRanking } from '@/components/chat/compare-judge-ranking';
import { CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '@/enums';
import type { CompareJudgeVerdict } from '@/types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}(${JSON.stringify(params)})` : key;

const ranked: CompareJudgeVerdict = {
  status: CompareJudgeVerdictStatus.RANKED,
  failureReason: null,
  judgeModel: 'OPENAI/gpt-5-mini',
  scale: { min: 0, max: 10 },
  lanes: [
    { laneIndex: 2, label: 'C', provider: 'DEEPSEEK', model: 'deepseek-chat', score: 9, rank: 1, reason: 'Best.', truncated: false, criticSummary: null },
    { laneIndex: 0, label: 'A', provider: 'OPENAI', model: 'gpt-5', score: 6, rank: 2, reason: 'Solid.', truncated: false, criticSummary: 'Needs work.' },
    { laneIndex: 1, label: 'B', provider: 'ANTHROPIC', model: 'claude-sonnet-4', score: 6, rank: 2, reason: 'Also solid.', truncated: true, criticSummary: null },
  ],
  winnerLaneIndex: 2,
  tiedLaneIndices: [],
  rationale: 'C wins on completeness.',
  truncated: true,
};

describe('CompareJudgeRanking', () => {
  it('renders one row per lane, best first, with the winner badge only on rank 1', () => {
    render(<CompareJudgeRanking verdict={ranked} t={t} />);

    const rows = screen.getAllByTestId('compare-judge-ranking-row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('deepseek-chat')).toBeInTheDocument();
    expect(screen.getAllByText('compare.ranking.winner')).toHaveLength(1);
    expect(screen.getByText('C wins on completeness.')).toBeInTheDocument();
  });

  it('shows a tie notice and gives the tied lanes the same rank text', () => {
    const tied: CompareJudgeVerdict = {
      ...ranked,
      winnerLaneIndex: null,
      tiedLaneIndices: [2, 0],
      lanes: ranked.lanes.map((lane) => ({ ...lane, rank: lane.laneIndex === 1 ? 3 : 1 })),
    };
    render(<CompareJudgeRanking verdict={tied} t={t} />);

    expect(screen.getByText('compare.ranking.tie')).toBeInTheDocument();
    expect(screen.queryAllByText('compare.ranking.winner')).toHaveLength(0);
  });

  it('shows the truncated-answer notice only on the truncated lane', () => {
    render(<CompareJudgeRanking verdict={ranked} t={t} />);
    expect(screen.getAllByText('compare.ranking.answerTruncated')).toHaveLength(1);
  });

  it.each([
    [CompareJudgeFailureReason.CALL_FAILED, 'compare.ranking.callFailed'],
    [CompareJudgeFailureReason.PARSE_FAILED, 'compare.ranking.unavailable'],
    [CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS, 'compare.ranking.notEnough'],
  ])('shows a notice and no ranking rows for %s', (failureReason, expectedKey) => {
    const unavailable: CompareJudgeVerdict = {
      ...ranked,
      status: CompareJudgeVerdictStatus.UNAVAILABLE,
      failureReason,
      lanes: [],
      winnerLaneIndex: null,
      rationale: null,
    };
    render(<CompareJudgeRanking verdict={unavailable} t={t} />);

    expect(screen.getByRole('status')).toHaveTextContent(expectedKey);
    expect(screen.queryAllByTestId('compare-judge-ranking-row')).toHaveLength(0);
  });

  it('never renders a winner badge when nothing was ranked, even with a stray winnerLaneIndex', () => {
    const malformed: CompareJudgeVerdict = {
      ...ranked,
      status: CompareJudgeVerdictStatus.UNAVAILABLE,
      failureReason: CompareJudgeFailureReason.PARSE_FAILED,
      lanes: [],
    };
    render(<CompareJudgeRanking verdict={malformed} t={t} />);
    expect(screen.queryAllByText('compare.ranking.winner')).toHaveLength(0);
  });
});
