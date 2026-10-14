import { useQuery } from '@tanstack/react-query';

import { useThreadCommentsFeed } from '@/hooks/threads/use-thread-comments-feed';
import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  PublicThreadPublication,
  ThreadPublicQueries,
} from '@/types/thread-publication.types';

export function useThreadPublicQueries(
  slug: string,
  initialPublication: PublicThreadPublication,
): ThreadPublicQueries {
  const publication = useQuery({
    queryKey: queryKeys.threadPublications.publicPage(slug),
    queryFn: () => threadPublicationsRepository.getPublic(slug),
    initialData: initialPublication,
    enabled: slug !== '',
  });
  const comments = useThreadCommentsFeed(slug);
  const reactions = useQuery({
    queryKey: queryKeys.threadPublications.reactions(slug),
    queryFn: () => threadPublicationsRepository.getPublicReactionSummary(slug),
    enabled: slug !== '',
  });
  return { publication, comments, reactions };
}
