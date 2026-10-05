import { useQuery } from '@tanstack/react-query';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

export function useThreadPublications() {
  return useQuery({
    queryKey: ['thread-publications', 'mine'],
    queryFn: () => threadPublicationsRepository.listMine(),
  });
}
