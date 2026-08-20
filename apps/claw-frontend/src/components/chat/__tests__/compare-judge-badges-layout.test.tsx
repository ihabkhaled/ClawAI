import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompareJudgeBadges } from '@/components/chat/compare-judge-badges';
import { CompareJudgeState } from '@/enums';

describe('CompareJudgeBadges layout', () => {
  it.each([
    [CompareJudgeState.VERIFIED, 'text-success'],
    [CompareJudgeState.REVISED, 'text-warning'],
    [CompareJudgeState.ESCALATED, 'text-info'],
    [CompareJudgeState.FAILED, 'text-destructive'],
    [CompareJudgeState.UNAVAILABLE, 'text-warning'],
    [CompareJudgeState.SKIPPED, 'text-muted-foreground'],
    [CompareJudgeState.AWAITING, 'text-muted-foreground'],
  ])('keeps %s labels wrapped and semantically colored', (judgeState, tone) => {
    render(<CompareJudgeBadges judgeState={judgeState} t={(key) => key} />);

    expect(screen.getByText(/^compare\./)).toHaveClass('break-words', tone);
  });
});
