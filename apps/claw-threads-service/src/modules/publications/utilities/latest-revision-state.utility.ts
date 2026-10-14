import type { PrivateGenerationState } from '../types/generation.types';
import type { LatestRevisionDraft } from '../types/owner-publication.types';

/**
 * The generation service only knows the originally generated draft. After a passing edit the
 * owner publishes the edited revision, so the private state shows that revision's draft and hash.
 * Scores the edit does not carry keep the generated draft's. Needs a state that has a draft.
 */
export function withLatestRevision(
  state: PrivateGenerationState,
  latest: LatestRevisionDraft,
): PrivateGenerationState {
  const original = state.draft;
  if (!original) return state;
  return {
    ...state,
    draft: {
      markdown: latest.markdown,
      citations: latest.citations,
      judgeScore: latest.judgeScore ?? original.judgeScore,
      criticScore: latest.criticScore ?? original.criticScore,
    },
    review: state.review ? { ...state.review, draftHash: latest.contentHash } : state.review,
  };
}
