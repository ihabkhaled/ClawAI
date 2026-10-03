import {
  AUTO_RESEARCH_MARKER_LEFT_BOUNDARY,
  AUTO_RESEARCH_MARKER_RIGHT_BOUNDARY,
  AUTO_RESEARCH_UNSPACED_SCRIPTS,
} from '../../../common/constants/auto-research-matching.constants';

function escapeRegExp(marker: string): string {
  return marker.replaceAll(/[|\\{}()[\]^$+*?.]/gu, String.raw`\$&`);
}

/**
 * Whether `text` contains any marker as a whole word or phrase. A marker in a
 * script written without spaces (Chinese, Japanese, Thai) is a plain substring,
 * because there is no word boundary to check.
 */
export function containsResearchMarker(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  const spaced: string[] = [];
  for (const marker of markers) {
    if (AUTO_RESEARCH_UNSPACED_SCRIPTS.test(marker)) {
      if (lower.includes(marker)) return true;
    } else {
      spaced.push(escapeRegExp(marker.toLowerCase()));
    }
  }
  return (
    spaced.length > 0 &&
    new RegExp(
      `${AUTO_RESEARCH_MARKER_LEFT_BOUNDARY}(?:${spaced.join('|')})${AUTO_RESEARCH_MARKER_RIGHT_BOUNDARY}`,
      'u',
    ).test(lower)
  );
}
