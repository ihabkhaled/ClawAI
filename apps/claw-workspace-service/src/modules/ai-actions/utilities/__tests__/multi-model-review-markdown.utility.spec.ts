import { renderReviewMarkdown } from '../multi-model-review-markdown.utility';
import type { MultiModelReviewResult } from '../../types/multi-model-review.types';

const baseTime = new Date('2026-05-12T12:34:56.000Z');

const goodReviewer = (label: string, content: string) => ({
  provider: 'P',
  model: 'm',
  label,
  success: true as const,
  content,
  inputTokens: 100,
  outputTokens: 50,
  latencyMs: 1234,
});

describe('renderReviewMarkdown', () => {
  it('renders judge verdict first when present', () => {
    const result: MultiModelReviewResult = {
      reviewers: [
        goodReviewer('Sonnet', '## Verdict\nLGTM'),
        goodReviewer('GPT-4o', 'Looks fine.'),
      ],
      judge: {
        provider: 'J',
        model: 'j-1',
        label: 'Judge',
        success: true,
        content: '## Final Recommendation\nMerge.',
        latencyMs: 2222,
      },
      anyReviewerSucceeded: true,
    };
    const md = renderReviewMarkdown({
      title: 'PR #42 — adds rate limiter',
      content: 'diff goes here',
      result,
      generatedAt: baseTime,
    });
    // Title + summary
    expect(md).toContain('# PR #42 — adds rate limiter');
    expect(md).toContain('Reviewers: **2/2** succeeded');
    expect(md).toContain('Judge: **ok**');
    // Judge section appears BEFORE individual reviewers
    const judgeIdx = md.indexOf('## Judge verdict');
    const reviewersIdx = md.indexOf('## Reviewer verdicts');
    expect(judgeIdx).toBeGreaterThan(0);
    expect(judgeIdx).toBeLessThan(reviewersIdx);
    expect(md).toContain('Merge.');
    expect(md).toContain('Reviewer 1 — Sonnet');
    expect(md).toContain('Reviewer 2 — GPT-4o');
    expect(md).toContain('## Source content reviewed');
    expect(md).toContain('diff goes here');
    expect(md).toContain('2026-05-12T12:34:56.000Z');
  });

  it('omits judge section when judge is null', () => {
    const result: MultiModelReviewResult = {
      reviewers: [goodReviewer('A', 'a')],
      judge: null,
      anyReviewerSucceeded: true,
    };
    const md = renderReviewMarkdown({ title: 't', content: 'c', result, generatedAt: baseTime });
    expect(md).not.toContain('## Judge verdict');
    expect(md).toContain('Judge: _not requested_');
  });

  it('renders judge failure section with error', () => {
    const result: MultiModelReviewResult = {
      reviewers: [goodReviewer('A', 'a')],
      judge: {
        provider: 'J',
        model: 'j',
        label: 'Judge',
        success: false,
        latencyMs: 5,
        errorMessage: 'upstream 5xx',
      },
      anyReviewerSucceeded: true,
    };
    const md = renderReviewMarkdown({ title: 't', content: 'c', result, generatedAt: baseTime });
    expect(md).toContain('## Judge pass failed');
    expect(md).toContain('upstream 5xx');
    expect(md).toContain('Judge: **failed**');
  });

  it('shows reviewer error blocks for failed reviewers', () => {
    const result: MultiModelReviewResult = {
      reviewers: [
        goodReviewer('Sonnet', 'ok'),
        {
          provider: 'OAI',
          model: 'gpt-4o',
          label: 'GPT-4o',
          success: false,
          latencyMs: 0,
          errorMessage: 'timeout',
        },
      ],
      judge: null,
      anyReviewerSucceeded: true,
    };
    const md = renderReviewMarkdown({ title: 't', content: 'c', result, generatedAt: baseTime });
    expect(md).toContain('Reviewers: **1/2** succeeded');
    expect(md).toContain('Reviewer 2 — GPT-4o');
    expect(md).toContain('failed');
    expect(md).toContain('timeout');
  });

  it('truncates very long content', () => {
    const longContent = 'X'.repeat(60_000);
    const result: MultiModelReviewResult = {
      reviewers: [goodReviewer('A', 'a')],
      judge: null,
      anyReviewerSucceeded: true,
    };
    const md = renderReviewMarkdown({
      title: 't',
      content: longContent,
      result,
      generatedAt: baseTime,
    });
    expect(md).toContain('... [truncated]');
    expect(md.length).toBeLessThan(60_000);
  });
});
