import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveCardVersionsResult } from '@/types/live.types';

/** A card's summary history, fetched only once its popover is opened. */
export function useLiveCardVersions(eventId: string): UseLiveCardVersionsResult {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.live.eventVersions(eventId),
    queryFn: () => liveRepository.listEventVersions(eventId),
    enabled: open,
  });
  return {
    open,
    setOpen,
    versions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
