import type { MultiModelReviewResult, ReviewerOutcome } from '../types/multi-model-review.types';

// v3 round 5 (2026-05-12) — Prompt 04 final polish: downloadable PR/MR
// review bundle.
//
// Renders a MultiModelReviewResult into a single self-contained markdown
// document the user can paste into the PR description, attach to a Jira
// ticket, or save as `.md`. Pure function: no DB, no HTTP, no side effects.

export function renderReviewMarkdown(input: {
  title: string;
  content: string;
  result: MultiModelReviewResult;
  generatedAt?: Date;
}): string {
  const generatedAt = (input.generatedAt ?? new Date()).toISOString();
  const lines: string[] = [];

  lines.push(`# ${input.title}`);
  lines.push('');
  lines.push(`_Generated ${generatedAt} by ClawAI multi-model review._`);
  lines.push('');

  // Status header — at-a-glance summary
  const ok = input.result.reviewers.filter((r) => r.success).length;
  const total = input.result.reviewers.length;
  const judgeStatus = renderJudgeStatus(input.result);
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Reviewers: **${String(ok)}/${String(total)}** succeeded`);
  lines.push(`- Judge: ${judgeStatus}`);
  lines.push('');

  // The judge verdict goes FIRST when present — that's what the user wants
  // to see in the rendered PR comment. Reviewers follow as supporting
  // evidence.
  if (input.result.judge !== null && input.result.judge.success) {
    lines.push('## Judge verdict');
    lines.push('');
    lines.push(
      `> Model: \`${input.result.judge.label}\` · ${String(input.result.judge.latencyMs)}ms`,
    );
    lines.push('');
    lines.push(input.result.judge.content ?? '_(empty)_');
    lines.push('');
  } else if (input.result.judge !== null && !input.result.judge.success) {
    lines.push('## Judge pass failed');
    lines.push('');
    lines.push(`> Model: \`${input.result.judge.label}\``);
    lines.push('');
    lines.push('```');
    lines.push(input.result.judge.errorMessage ?? 'unknown');
    lines.push('```');
    lines.push('');
  }

  lines.push('## Reviewer verdicts');
  lines.push('');
  for (const [idx, r] of input.result.reviewers.entries()) {
    lines.push(`### Reviewer ${String(idx + 1)} — ${r.label}`);
    lines.push('');
    lines.push(...renderReviewerBlock(r));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Source content reviewed');
  lines.push('');
  lines.push('```');
  // Defensively trim huge diffs so the bundle stays under typical PR
  // comment limits (GitHub: 65536 chars). The full content stays in the
  // approval queue row.
  const trimmed =
    input.content.length > 50_000
      ? `${input.content.slice(0, 50_000)}\n... [truncated]`
      : input.content;
  lines.push(trimmed);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function renderJudgeStatus(result: MultiModelReviewResult): string {
  if (result.judge === null) return '_not requested_';
  if (result.judge.success) return `**ok** (\`${result.judge.label}\`)`;
  return `**failed** (\`${result.judge.label}\` — ${result.judge.errorMessage ?? 'unknown'})`;
}

function renderReviewerBlock(r: ReviewerOutcome): string[] {
  if (r.success) {
    const tokens =
      r.inputTokens !== undefined && r.outputTokens !== undefined
        ? ` · tokens ${String(r.inputTokens)} in / ${String(r.outputTokens)} out`
        : '';
    return [
      `> Model: \`${r.provider}/${r.model}\` · ${String(r.latencyMs)}ms${tokens}`,
      '',
      r.content ?? '_(empty response)_',
    ];
  }
  return [
    `> Model: \`${r.provider}/${r.model}\` — **failed**`,
    '',
    '```',
    r.errorMessage ?? 'unknown error',
    '```',
  ];
}
