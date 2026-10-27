import {
  ANY_LETTER_PATTERN,
  ARABIC_SCRIPT_FOLDS,
  EVIDENCE_GAP_TERMS,
  LATIN_LETTER_PATTERN,
  MATCH_IGNORED_CHARS_PATTERN,
} from '../constants/evidence-gap.constants';
import type { BlockerSplit } from '../types/evidence-gap.types';

/** Lower case, marks and zero-width characters removed, Arabic and Persian letter variants unified. */
function foldForMatch(text: string): string {
  const lowered = text.normalize('NFKC').toLowerCase().replaceAll(MATCH_IGNORED_CHARS_PATTERN, '');
  return [...lowered].map((char) => ARABIC_SCRIPT_FOLDS.get(char) ?? char).join('');
}

/** A Latin term must start a word ("resources" is not "source"); other scripts match anywhere. */
function termAppears(haystack: string, term: string): boolean {
  const needsWordStart = LATIN_LETTER_PATTERN.test(term.charAt(0));
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(term, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : haystack.charAt(at - 1);
    if (!needsWordStart || before === '' || !ANY_LETTER_PATTERN.test(before)) return true;
    from = at + 1;
  }
}

/**
 * True when a Judge or Critic blocker asks for evidence: sources, citations, primary sources, a
 * check against files or a repository, or a fact that cannot be verified. Deterministic keyword
 * match over the languages Threads writes in; a blocker about style, structure or a contradiction
 * matches none of the terms and never triggers research.
 */
export function isEvidenceGapBlocker(blocker: string): boolean {
  const text = `${foldForMatch(blocker)} `;
  return EVIDENCE_GAP_TERMS.some((term) => termAppears(text, foldForMatch(term)));
}

export function splitBlockers(blockers: readonly string[]): BlockerSplit {
  const evidenceGaps: string[] = [];
  const others: string[] = [];
  for (const blocker of blockers) {
    (isEvidenceGapBlocker(blocker) ? evidenceGaps : others).push(blocker);
  }
  return { evidenceGaps, others };
}

/** True when there is at least one blocker and every blocker is an evidence gap. */
export function onlyEvidenceGaps(blockers: readonly string[]): boolean {
  return blockers.length > 0 && blockers.every(isEvidenceGapBlocker);
}
