import type { AuthorDraft } from '../types/generation-pipeline.types';
import { LEGACY_URL_ID_MARKER, UNTITLED_PLACEHOLDER } from '../constants/legacy-draft.constants';
import { headingsOf } from './format-markdown-scan.utility';

/**
 * An article stored by an older release can carry two shapes the typesetter's guard cannot
 * reason about: citation markers written as `[address, id]` (the guard only knows `[id]`, so the
 * model's cleanup reads as a lost or added citation) and no H1 at all (the guard demands exactly
 * one). Both are normalised BEFORE the pass, and the normalised text is the baseline the guard
 * compares with, so the model is judged on layout only. A pair of a known source becomes `[id]`; an
 * unknown pair is removed.
 */
export function prepareLegacyDraft(draft: AuthorDraft, title: string): AuthorDraft {
  const known = new Map(
    draft.citations.map(({ evidenceId }) => [evidenceId.toLowerCase(), evidenceId]),
  );
  const byUrl = new Map(
    draft.citations.map(({ evidenceId, url }) => [url.toLowerCase(), evidenceId]),
  );
  let markdown = draft.markdown.replaceAll(
    LEGACY_URL_ID_MARKER,
    (_match, url: string, id: string) => {
      const evidenceId = known.get(id.toLowerCase()) ?? byUrl.get(url.toLowerCase());
      return evidenceId === undefined ? '' : `[${evidenceId}]`;
    },
  );
  if (!headingsOf(markdown).some(({ level }) => level === 1)) {
    const heading = title.trim();
    if (heading !== '' && heading !== UNTITLED_PLACEHOLDER) {
      markdown = `# ${heading}\n\n${markdown.trimStart()}`;
    }
  }
  return { ...draft, markdown };
}
