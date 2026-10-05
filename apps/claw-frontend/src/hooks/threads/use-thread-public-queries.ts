import { useQuery } from '@tanstack/react-query';

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
    queryKey: ['thread-publications', 'public', slug],
    queryFn: () => threadPublicationsRepository.getPublic(slug),
    initialData: initialPublication,
    enabled: slug !== '',
  });
  const comments = useQuery({
    queryKey: ['thread-publications', 'public', slug, 'comments'],
    queryFn: () => threadPublicationsRepository.listPublicComments(slug),
    enabled: slug !== '',
  });
  const reactions = useQuery({
    queryKey: ['thread-publications', 'public', slug, 'reactions'],
    queryFn: () => threadPublicationsRepository.getPublicReactionSummary(slug),
    enabled: slug !== '',
  });
  return { publication, comments, reactions };
}
