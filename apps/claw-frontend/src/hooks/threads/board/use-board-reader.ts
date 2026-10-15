'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useLocalizedHref } from '@/hooks/common/use-localized-href';
import { useThreadCommentsFeed } from '@/hooks/threads/use-thread-comments-feed';
import { useThreadPublicActions } from '@/hooks/threads/use-thread-public-actions';
import { useThreadPublicView } from '@/hooks/threads/use-thread-public-view';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type { BoardReaderController } from '@/types/thread-board-reader.types';
import {
  boardReaderPath,
  readBoardListUrl,
  threadPublicPath,
} from '@/utilities/thread-board-list-url.utility';
import { decodeThreadSlugParam } from '@/utilities/thread-slug.utility';
import {
  readRememberedReaction,
  withRememberedReaction,
} from '@/utilities/thread-viewer-reaction.utility';

/** Everything the in-app reader needs; shares query keys with the public page so reactions stay in sync. */
export function useBoardReader(): BoardReaderController {
  const params = useParams<{ slug: string }>();
  // Next hands the segment over percent-encoded; the API and every query key use the real slug.
  const slug = decodeThreadSlugParam(params.slug ?? '') ?? '';
  const router = useRouter();
  const localise = useLocalizedHref();
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [boardHref, setBoardHref] = useState('/board');
  const publicPath = threadPublicPath(slug);
  useEffect(() => {
    // Known only in the browser, so it appears after hydration and never mismatches it.
    setPublicUrl(`${window.location.origin}${publicPath}`);
    setBoardHref(readBoardListUrl() ?? '/board');
  }, [publicPath]);

  const enabled = slug !== '';
  const publication = useQuery({
    queryKey: queryKeys.threadPublications.publicPage(slug),
    queryFn: () => threadPublicationsRepository.getPublic(slug),
    enabled,
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status === 404) && count < 2,
  });
  const comments = useThreadCommentsFeed(slug);
  const reactions = useQuery({
    queryKey: queryKeys.threadPublications.reactions(slug),
    queryFn: () => threadPublicationsRepository.getPublicReactionSummary(slug),
    enabled,
  });
  const actions = useThreadPublicActions(slug);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id ?? '');
  useThreadPublicView(slug, isAuthenticated);
  const error = publication.error;
  const isNotFound = slug === '' || (error instanceof ApiClientError && error.status === 404);

  function goBack(): void {
    router.push(boardHref);
  }

  return {
    publication: publication.data,
    comments: comments.comments,
    highlightedCommentId: comments.highlightedId,
    commentMissing: comments.commentMissing,
    commentTotal: comments.commentTotal,
    hasMoreComments: comments.hasMore,
    isLoadingMoreComments: comments.isLoadingMore,
    loadMoreComments: comments.loadMore,
    reactions: withRememberedReaction(
      reactions.data,
      isAuthenticated && userId !== '' ? readRememberedReaction(userId, slug) : null,
    ),
    isAuthenticated,
    isLoading: publication.isLoading,
    isNotFound,
    isError: publication.isError && !isNotFound,
    communityLoading: comments.isLoading || reactions.isLoading,
    communityError: comments.isError || reactions.isError,
    loginHref: localise(`/login?returnTo=${encodeURIComponent(boardReaderPath(slug))}`),
    publicUrl,
    publicPath,
    boardHref,
    actions,
    goBack,
    retry: () => {
      void publication.refetch();
    },
  };
}
