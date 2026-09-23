import { describe, expect, it } from 'vitest';

import { CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '@/enums';
import type { ParallelModelResponse } from '@/types';
import {
  buildCompareRankingRows,
  getCompareJudgeNoticeKey,
  getCompareJudgeVerdict,
  getLaneRanking,
  readCompareJudgeVerdict,
  readCompareLaneIndex,
  resolveBestResponse,
} from '@/utilities';

const rankedVerdictMeta = {
  status: CompareJudgeVerdictStatus.RANKED,
  failureReason: null,
  judgeModel: 'OPENAI/gpt-5-mini',
  scale: { min: 0, max: 10 },
  lanes: [
    { laneIndex: 2, label: 'C', provider: 'DEEPSEEK', model: 'deepseek-chat', score: 9, rank: 1, reason: 'Best.', truncated: false, criticSummary: null },
    { laneIndex: 0, label: 'A', provider: 'OPENAI', model: 'gpt-5', score: 6, rank: 2, reason: 'Solid.', truncated: false, criticSummary: 'Needs work.' },
    { laneIndex: 1, label: 'B', provider: 'ANTHROPIC', model: 'claude-sonnet-4', score: 4, rank: 3, reason: 'Thin.', truncated: true, criticSummary: null },
  ],
  winnerLaneIndex: 2,
  tiedLaneIndices: [],
  rationale: 'C wins on completeness.',
  truncated: true,
};

const baseResponse: ParallelModelResponse = {
  provider: 'OPENAI',
  model: 'gpt-5',
  content: 'answer',
  latencyMs: 100,
  inputTokens: 10,
  outputTokens: 20,
  status: 'completed' as ParallelModelResponse['status'],
  errorMessage: null,
};

describe('readCompareJudgeVerdict', () => {
  it('reads a well-formed verdict from message metadata', () => {
    const verdict = readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta });
    expect(verdict?.status).toBe(CompareJudgeVerdictStatus.RANKED);
    expect(verdict?.lanes).toHaveLength(3);
    expect(verdict?.winnerLaneIndex).toBe(2);
  });

  it('returns null for missing or malformed metadata', () => {
    expect(readCompareJudgeVerdict(null)).toBeNull();
    expect(readCompareJudgeVerdict({})).toBeNull();
    expect(readCompareJudgeVerdict({ compareJudge: { status: 'not-a-real-status' } })).toBeNull();
    expect(
      readCompareJudgeVerdict({ compareJudge: { status: CompareJudgeVerdictStatus.RANKED, lanes: [{ laneIndex: 'nope' }] } }),
    ).toBeNull();
  });

  it('normalises an unrecognised failure reason to null', () => {
    const verdict = readCompareJudgeVerdict({
      compareJudge: { ...rankedVerdictMeta, status: CompareJudgeVerdictStatus.UNAVAILABLE, failureReason: 'made_up', lanes: [] },
    });
    expect(verdict?.failureReason).toBeNull();
  });
});

describe('readCompareLaneIndex', () => {
  it('reads the lane index, or null when absent', () => {
    expect(readCompareLaneIndex({ compareLaneIndex: 2 })).toBe(2);
    expect(readCompareLaneIndex({})).toBeNull();
    expect(readCompareLaneIndex(null)).toBeNull();
  });
});

describe('getLaneRanking', () => {
  it('finds this lane in the shared verdict', () => {
    const verdict = readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta });
    const response: ParallelModelResponse = { ...baseResponse, compareLaneIndex: 1, compareJudge: verdict };
    expect(getLaneRanking(response)?.label).toBe('B');
  });

  it('returns null when the lane or verdict is missing', () => {
    expect(getLaneRanking(baseResponse)).toBeNull();
  });
});

describe('buildCompareRankingRows', () => {
  it('marks the winner and computes a 0-100 bar width from the scale', () => {
    const verdict = readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta });
    if (!verdict) {
      throw new Error('fixture did not parse');
    }
    const rows = buildCompareRankingRows(verdict);
    expect(rows.find((r) => r.laneIndex === 2)?.isWinner).toBe(true);
    expect(rows.find((r) => r.laneIndex === 2)?.scorePercent).toBe(90);
    expect(rows.find((r) => r.laneIndex === 1)?.isWinner).toBe(false);
  });
});

describe('getCompareJudgeNoticeKey', () => {
  it('is null for a ranked verdict with lanes', () => {
    const verdict = readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta });
    expect(verdict && getCompareJudgeNoticeKey(verdict)).toBeNull();
  });

  it('maps each failure reason to its own notice key', () => {
    const build = (failureReason: CompareJudgeFailureReason) =>
      readCompareJudgeVerdict({
        compareJudge: { ...rankedVerdictMeta, status: CompareJudgeVerdictStatus.UNAVAILABLE, failureReason, lanes: [] },
      });
    expect(getCompareJudgeNoticeKey(build(CompareJudgeFailureReason.CALL_FAILED)!)).toBe(
      'compare.ranking.callFailed',
    );
    expect(getCompareJudgeNoticeKey(build(CompareJudgeFailureReason.PARSE_FAILED)!)).toBe(
      'compare.ranking.unavailable',
    );
    expect(getCompareJudgeNoticeKey(build(CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS)!)).toBe(
      'compare.ranking.notEnough',
    );
  });
});

describe('resolveBestResponse', () => {
  it('uses the judge winner when a verdict is present, ignoring the heuristic', () => {
    const responses: ParallelModelResponse[] = [
      { ...baseResponse, model: 'gpt-5', compareLaneIndex: 0, compareJudge: readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta }) },
      { ...baseResponse, model: 'deepseek-chat', provider: 'DEEPSEEK', compareLaneIndex: 2, compareJudge: readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta }) },
    ];
    const best = resolveBestResponse(responses, 'gpt-5');
    expect(best).toEqual({ model: 'deepseek-chat', judged: true });
  });

  it('falls back to the heuristic when there is no judge verdict', () => {
    expect(resolveBestResponse([baseResponse], 'gpt-5')).toEqual({ model: 'gpt-5', judged: false });
  });

  it('names no winner when the judge ran but produced no ranking', () => {
    const unavailable = readCompareJudgeVerdict({
      compareJudge: { ...rankedVerdictMeta, status: CompareJudgeVerdictStatus.UNAVAILABLE, failureReason: CompareJudgeFailureReason.PARSE_FAILED, lanes: [], winnerLaneIndex: null },
    });
    const responses: ParallelModelResponse[] = [{ ...baseResponse, compareLaneIndex: 0, compareJudge: unavailable }];
    expect(resolveBestResponse(responses, 'gpt-5')).toEqual({ model: null, judged: true });
  });
});

describe('getCompareJudgeVerdict', () => {
  it('reads the shared verdict off whichever lane carries it', () => {
    const verdict = readCompareJudgeVerdict({ compareJudge: rankedVerdictMeta });
    const responses: ParallelModelResponse[] = [baseResponse, { ...baseResponse, compareJudge: verdict }];
    expect(getCompareJudgeVerdict(responses)?.judgeModel).toBe('OPENAI/gpt-5-mini');
  });

  it('is null when no lane carries a verdict', () => {
    expect(getCompareJudgeVerdict([baseResponse])).toBeNull();
  });
});
