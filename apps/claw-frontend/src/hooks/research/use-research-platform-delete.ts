import { useState } from 'react';

import type {
  ResearchPlatform,
  UseResearchPlatformDeleteReturn,
} from '@/types/research-platform.types';

import { useDeleteResearchPlatform } from './use-research-platforms';

/** Delete asks first: `request` opens the confirm dialog, `confirm` deletes and closes it. */
export function useResearchPlatformDelete(): UseResearchPlatformDeleteReturn {
  const del = useDeleteResearchPlatform();
  const [pending, setPending] = useState<ResearchPlatform | null>(null);

  const confirm = async (): Promise<void> => {
    if (pending === null) {
      return;
    }
    try {
      await del.mutateAsync(pending.id);
      setPending(null);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel; the row is still there.
      console.error('Research platform delete failed', error);
    }
  };

  return {
    pending,
    isDeleting: del.isPending,
    request: setPending,
    onOpenChange: (open) => (open ? undefined : setPending(null)),
    confirm,
  };
}
