import { READER_PROXY_TARGET_STATUS_PATTERN } from '../constants/fetch-strategy.constants';

/**
 * Jina Reader answers 200 and reports the TARGET's own error inside its
 * text ("Target URL returned error 404"). Returns that status, or 200.
 */
export function readReaderTargetStatus(text: string): number {
  const match = READER_PROXY_TARGET_STATUS_PATTERN.exec(text.slice(0, 2_000));
  return match?.[1] === undefined ? 200 : Number.parseInt(match[1], 10);
}

/** The `Title:` line Jina Reader puts at the top of its answer, if present. */
export function readReaderTitle(text: string): string | null {
  const match = /^Title:\s*(.+)$/mu.exec(text.slice(0, 500));
  return match?.[1]?.trim() ?? null;
}
