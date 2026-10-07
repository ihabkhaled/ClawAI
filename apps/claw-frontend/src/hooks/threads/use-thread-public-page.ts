'use client';

import { useParams } from 'next/navigation';

import { useThreadPublicActions } from '@/hooks/threads/use-thread-public-actions';
import { useThreadPublicQueries } from '@/hooks/threads/use-thread-public-queries';
import { useThreadPublicView } from '@/hooks/threads/use-thread-public-view';
import { ApiClientError } from '@/services/shared/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  ThreadPublicPageController,
  PublicThreadPublication,
} from '@/types/thread-publication.types';

export function useThreadPublicPage(
  initialPublication: PublicThreadPublication,
): ThreadPublicPageController {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const queries = useThreadPublicQueries(slug, initialPublication);
  const actions = useThreadPublicActions(slug);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useThreadPublicView(slug, isAuthenticated);
  const error = queries.publication.error;
  const isNotFound = error instanceof ApiClientError && error.status === 404;

  return {
    publication: queries.publication.data,
    comments: queries.comments.data ?? [],
    reactions: queries.reactions.data,
    isAuthenticated,
    isLoading: queries.publication.isLoading,
    isNotFound,
    isError: queries.publication.isError && !isNotFound,
    communityLoading: queries.comments.isLoading || queries.reactions.isLoading,
    communityError: queries.comments.isError || queries.reactions.isError,
    loginHref: `/login?returnTo=${encodeURIComponent(`/threads/${slug}`)}`,
    actions,
  };
}
