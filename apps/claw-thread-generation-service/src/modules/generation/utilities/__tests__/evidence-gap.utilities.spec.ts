import { EVIDENCE_GAP_MAX_NEW_ITEMS } from '../../constants/evidence-gap.constants';
import type { StepRow } from '../../types/step-recorder.types';
import { buildEvidenceGapQuery } from '../evidence-gap-query.utility';
import { isCitableEvidenceUrl, mergeEvidenceBundles } from '../evidence-merge.utility';
import { latestReviewVerdict } from '../review-failure.utility';
import { parseVerdict, serializeVerdict } from '../review-verdict.utility';

const item = (id: string, url: string): Record<string, unknown> => ({ id, url, snippet: 's' });

describe('mergeEvidenceBundles', () => {
  const base = { warnings: ['w'], items: [item('a1', 'https://example.org/one')] };

  it('keeps existing items first and adds only new, citable ones', () => {
    const merged = mergeEvidenceBundles(base, {
      items: [
        item('a1', 'https://example.org/one'),
        item('b2', 'https://WWW.example.org/one/?utm_source=x'),
        item('c3', 'https://primary.example.org/paper'),
        item('d4', 'http://127.0.0.1/admin'),
        item('e5', 'https://user:pw@example.org/x'),
        item('f6', 'file:///etc/passwd'),
      ],
    });
    expect(merged.addedIds).toEqual(['c3']);
    expect(merged.bundle['items']).toEqual([
      base.items[0],
      item('c3', 'https://primary.example.org/paper'),
    ]);
    expect(merged.bundle['warnings']).toEqual(['w']);
    expect(merged.sha256).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('returns the same bundle and the hash of it when nothing is new', () => {
    const merged = mergeEvidenceBundles(base, { items: [item('a1', 'https://example.org/one')] });
    expect(merged.addedIds).toEqual([]);
    expect(merged.bundle).toBe(base);
  });

  it('adds at most the per-pass limit', () => {
    const many = Array.from({ length: EVIDENCE_GAP_MAX_NEW_ITEMS + 5 }, (_, index) =>
      item(`n${String(index)}`, `https://example.org/new-${String(index)}`),
    );
    expect(mergeEvidenceBundles(base, { items: many }).addedIds).toHaveLength(
      EVIDENCE_GAP_MAX_NEW_ITEMS,
    );
  });

  it('never lets the bundle pass its item cap', () => {
    const full = {
      items: Array.from({ length: 29 }, (_, index) =>
        item(`o${String(index)}`, `https://example.org/old-${String(index)}`),
      ),
    };
    const merged = mergeEvidenceBundles(full, {
      items: [item('x1', 'https://a.example.org/1'), item('x2', 'https://a.example.org/2')],
    });
    expect(merged.addedIds).toEqual(['x1']);
  });

  it('skips items without an id or url and a bundle without items', () => {
    expect(mergeEvidenceBundles(base, { items: [{ id: 3 }, 'x', null] }).addedIds).toEqual([]);
    expect(mergeEvidenceBundles(base, {}).addedIds).toEqual([]);
  });
});

describe('isCitableEvidenceUrl', () => {
  it.each([
    ['https://example.org/a', true],
    ['http://example.org/a', true],
    ['http://localhost:3000/', false],
    ['http://192.168.1.4/', false],
    ['http://10.0.0.2/', false],
    ['http://169.254.169.254/latest', false],
    ['https://printer.local/', false],
    ['ftp://example.org/', false],
    ['not a url', false],
  ])('%s -> %s', (url, expected) => {
    expect(isCitableEvidenceUrl(url)).toBe(expected);
  });
});

describe('buildEvidenceGapQuery', () => {
  it('joins the topic and the blockers, capped and single-spaced', () => {
    const query = buildEvidenceGapQuery('Sycophancy   and\nreward hacking', [
      'cite independent\tprimary sources',
    ]);
    expect(query).toBe(
      'Find independent primary sources for: Sycophancy and reward hacking\ncite independent primary sources',
    );
  });

  it('removes secrets and url query strings and never exceeds the cap', () => {
    const secret = ['sk', 'a'.repeat(30)].join('-');
    const query = buildEvidenceGapQuery(`topic ${secret} https://example.org/p?token=abc`, [
      'x'.repeat(5000),
      'y'.repeat(5000),
      'z',
      'w',
    ]);
    expect(query).not.toContain(secret);
    expect(query).not.toContain('token=abc');
    expect([...query].length).toBeLessThanOrEqual(700);
  });

  it('works with no blockers', () => {
    expect(buildEvidenceGapQuery('A topic', [])).toBe(
      'Find independent primary sources for: A topic',
    );
  });
});

describe('review verdict records', () => {
  it('round-trips score, minimum and blockers', () => {
    const text = serializeVerdict({ score: 84, blockers: ['one', 'two'] }, 80);
    expect(parseVerdict(text)).toEqual({ score: 84, minScore: 80, blockers: ['one', 'two'] });
  });

  it('keeps at most three blockers, each shortened', () => {
    const text = serializeVerdict(
      { score: 70, blockers: ['a', 'b', 'c', 'd'].map((x) => x.repeat(400)) },
      80,
    );
    const parsed = parseVerdict(text);
    expect(parsed?.blockers).toHaveLength(3);
    expect([...(parsed?.blockers[0] ?? '')].length).toBeLessThanOrEqual(280);
    expect(text.length).toBeLessThanOrEqual(1200);
  });

  it('is null for anything that is not a verdict', () => {
    expect(parseVerdict(null)).toBeNull();
    expect(parseVerdict('plain text')).toBeNull();
    expect(parseVerdict('{"score":"x"}')).toBeNull();
  });
});

describe('latestReviewVerdict', () => {
  const row = (over: Partial<StepRow>): StepRow => ({
    seq: 1,
    at: new Date('2026-10-27T10:00:00.000Z'),
    stage: 'JUDGE',
    round: 1,
    outcome: 'RETRY',
    roleKind: 'JUDGE',
    roleId: 'judge',
    provider: null,
    model: null,
    code: 'JUDGE_BLOCKED',
    httpStatus: null,
    durationMs: null,
    inputTokens: null,
    outputTokens: null,
    excerpt: serializeVerdict({ score: 84, blockers: ['cite primary sources'] }, 80),
    ...over,
  });

  it('reads the newest review step and says when the blockers alone failed it', () => {
    const verdict = latestReviewVerdict([
      row({
        seq: 1,
        excerpt: serializeVerdict({ score: 50, blockers: [] }, 80),
        code: 'JUDGE_SCORE_LOW',
      }),
      row({ seq: 2 }),
    ]);
    expect(verdict).toEqual({
      reviewer: 'JUDGE',
      score: 84,
      minScore: 80,
      blockers: ['cite primary sources'],
      blocked: true,
      evidenceGapBlockers: ['cite primary sources'],
    });
  });

  it('is not blocked when the score is below the minimum', () => {
    const verdict = latestReviewVerdict([
      row({ excerpt: serializeVerdict({ score: 60, blockers: ['x'] }, 80) }),
    ]);
    expect(verdict).toMatchObject({ score: 60, blocked: false });
  });

  it('is null for steps from before verdicts were recorded', () => {
    expect(latestReviewVerdict([row({ excerpt: '{"revisionBrief":"b"}' })])).toBeNull();
    expect(latestReviewVerdict([row({ roleKind: 'AUTHOR' })])).toBeNull();
    expect(latestReviewVerdict([])).toBeNull();
  });
});
