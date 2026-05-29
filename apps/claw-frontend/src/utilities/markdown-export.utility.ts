import type { CompareResultMarkdownInput } from '@/types/compare.types';
import type { ParallelModelResponse } from '@/types/parallel.types';

/**
 * Escape a value so it is safe to embed inside a single-line YAML scalar.
 * Wraps the value in double quotes and escapes any embedded quotes/backslashes.
 */
function toYamlScalar(value: string): string {
  const escaped = value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `"${escaped}"`;
}

/**
 * Build the YAML frontmatter + heading prefix shared by single-result and
 * combined-run exports. Returns the frontmatter block followed by an H-level
 * heading for the model.
 */
function buildResultFrontmatter(
  input: CompareResultMarkdownInput,
  headingLevel: number,
): string {
  const totalTokens = (input.inputTokens ?? 0) + (input.outputTokens ?? 0);
  const createdAtIso = input.createdAt ? new Date(input.createdAt).toISOString() : '';
  const lines = [
    '---',
    'source: ClawAI Compare',
    `provider: ${toYamlScalar(input.provider)}`,
    `model: ${toYamlScalar(input.model)}`,
    `latencyMs: ${String(input.latencyMs)}`,
    `promptTokens: ${String(input.inputTokens ?? 0)}`,
    `completionTokens: ${String(input.outputTokens ?? 0)}`,
    `totalTokens: ${String(totalTokens)}`,
    `createdAt: ${toYamlScalar(createdAtIso)}`,
    '---',
    '',
    `${'#'.repeat(headingLevel)} ${input.model}`,
    '',
  ];
  return lines.join('\n');
}

/**
 * Build a self-contained Markdown document for a single compare result:
 * YAML frontmatter (metadata) followed by an `# {model}` heading and content.
 */
export function buildCompareResultMarkdown(input: CompareResultMarkdownInput): string {
  return `${buildResultFrontmatter(input, 1)}${input.content}\n`;
}

/**
 * Build one Markdown document combining every compare result, each rendered as
 * its own `## {model}` section with inline metadata. The shared prompt is
 * surfaced at the top of the document.
 */
export function buildCompareRunMarkdown(
  prompt: string,
  results: ParallelModelResponse[],
): string {
  const header = [
    '---',
    'source: ClawAI Compare',
    '---',
    '',
    '# ClawAI Compare Run',
    '',
    '## Prompt',
    '',
    prompt,
    '',
    '---',
    '',
  ];
  const sections = results.map((result) => {
    const totalTokens = (result.inputTokens ?? 0) + (result.outputTokens ?? 0);
    const meta = [
      `## ${result.model}`,
      '',
      `- **Provider:** ${result.provider}`,
      `- **Latency:** ${String(result.latencyMs)}ms`,
      `- **Prompt tokens:** ${String(result.inputTokens ?? 0)}`,
      `- **Completion tokens:** ${String(result.outputTokens ?? 0)}`,
      `- **Total tokens:** ${String(totalTokens)}`,
      '',
      result.content,
      '',
    ];
    return meta.join('\n');
  });
  return `${header.join('\n')}\n${sections.join('\n')}`;
}

/**
 * Trigger a browser download of `content` as a `.md` file. No-op during SSR.
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
