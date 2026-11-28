import { useState } from 'react';

import type {
  ResearchPlatform,
  UseResearchPlatformToggleReturn,
} from '@/types/research-platform.types';

import { useUpdateResearchPlatform } from './use-research-platforms';

/** The enable switch on a row: one PATCH `{ enabled }`; a failure shows a banner and the list stays as stored. */
export function useResearchPlatformToggle(): UseResearchPlatformToggleReturn {
  const update = useUpdateResearchPlatform();
  const [hasFailed, setHasFailed] = useState(false);

  const toggle = async (platform: ResearchPlatform, enabled: boolean): Promise<void> => {
    setHasFailed(false);
    try {
      await update.mutateAsync({ id: platform.id, body: { enabled } });
    } catch (error) {
      console.error('Research platform toggle failed', error);
      setHasFailed(true);
    }
  };

  return { pendingId: update.pendingId, hasFailed, toggle };
}
