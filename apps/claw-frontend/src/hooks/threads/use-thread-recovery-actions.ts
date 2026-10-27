import { ThreadFailureRemedy, type ThreadGenerationProgress } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ROUTES } from '@/constants/routes.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { threadRecommendedTeamRepository } from '@/repositories/threads/thread-recommended-team.repository';
import type {
  ThreadRecoveryController,
  ThreadRetryFormController,
} from '@/types/thread-generation-progress.types';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';
import {
  buildRecoveryActions,
  buildRecoveryRetryRequest,
} from '@/utilities/thread-recovery.utility';

/**
 * The one-click remedies of a failed generation (ADR-181). Remedies that need the owner to type
 * or pick something open the "retry with changes" form; the rest send one retry. A retry resumes
 * at the failed phase on the service side, so these requests only say what to change.
 */
export function useThreadRecoveryActions(
  publicationId: string,
  progress: ThreadGenerationProgress | undefined,
  retryForm: ThreadRetryFormController,
): ThreadRecoveryController {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (remedy: ThreadFailureRemedy) => {
      if (!progress) {
        throw new Error('The failed generation is not loaded yet');
      }
      const team =
        remedy === ThreadFailureRemedy.USE_RECOMMENDED_TEAM
          ? ((await threadRecommendedTeamRepository.get()).team ?? null)
          : null;
      const request = buildRecoveryRetryRequest({
        remedy,
        progress,
        idempotencyKey: crypto.randomUUID(),
        team,
      });
      if (request === null) {
        // Nothing to send for this account (for example no recommended team): let the owner pick.
        retryForm.open();
        return null;
      }
      return threadPublicationsRepository.retryGeneration(publicationId, request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', publicationId] });
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });

  const actions = progress?.failure ? buildRecoveryActions(progress.failure) : [];

  return {
    actions,
    run: (remedy) => {
      const action = actions.find((candidate) => candidate.remedy === remedy);
      if (action === undefined || mutation.isPending) {
        return;
      }
      if (action.oneClick) {
        mutation.mutate(remedy);
      } else if (remedy === ThreadFailureRemedy.NARROW_CLAIMS) {
        retryForm.openNarrow();
      } else if (remedy === ThreadFailureRemedy.ACCEPT_GAPS) {
        retryForm.openAcceptGaps();
      } else if (remedy !== ThreadFailureRemedy.ADD_CREDIT) {
        retryForm.open();
      }
    },
    pending: mutation.isPending ? (mutation.variables ?? null) : null,
    error: mutation.isError ? resolveThreadErrorMessage(mutation.error) : null,
    addCreditHref: ROUTES.BILLING,
  };
}
