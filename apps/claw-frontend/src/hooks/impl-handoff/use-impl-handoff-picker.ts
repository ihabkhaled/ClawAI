import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ImplHandoffMode } from '@/enums/impl-handoff-mode.enum';
import { ImplHandoffStatus } from '@/enums/impl-handoff-status.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import { initiateHandoff } from '@/repositories/workspace/impl-handoff.repository';
import type { HandoffPayload, UseImplHandoffPickerResult } from '@/types/impl-handoff.types';

/**
 * Stream 41 + 41.7 — when AGENT mode dispatch returns 409 NO_ACTIVE_AGENT_DEVICE
 * (or any non-2xx), the hook automatically retries with CHAT mode and surfaces
 * a `fallbackHint` to the dialog so the user knows we changed the destination.
 */
export function useImplHandoffPicker(): UseImplHandoffPickerResult {
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackHint, setFallbackHint] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: { queueId: string; mode: ImplHandoffMode }) =>
      initiateHandoff(params.queueId, params.mode),
  });

  const initiate = useCallback(
    async (queueId: string, mode: ImplHandoffMode): Promise<HandoffPayload | null> => {
      setErrorMessage(null);
      setFallbackHint(null);
      try {
        const result = await mutation.mutateAsync({ queueId, mode });
        if (result.status === ImplHandoffStatus.FAILED && mode === ImplHandoffMode.AGENT) {
          setFallbackHint('AGENT mode failed. Retrying with CHAT mode.');
          const retry = await mutation.mutateAsync({ queueId, mode: ImplHandoffMode.CHAT });
          await queryClient.invalidateQueries({ queryKey: queryKeys.implHandoffs.all });
          return retry;
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.implHandoffs.all });
        return result;
      } catch (error) {
        const msg = (error as Error).message;
        if (mode === ImplHandoffMode.AGENT && msg.includes('NO_ACTIVE_AGENT_DEVICE')) {
          setFallbackHint('No paired agent device. Falling back to CHAT mode.');
          try {
            const retry = await mutation.mutateAsync({ queueId, mode: ImplHandoffMode.CHAT });
            await queryClient.invalidateQueries({ queryKey: queryKeys.implHandoffs.all });
            return retry;
          } catch (retryError) {
            setErrorMessage((retryError as Error).message);
            return null;
          }
        }
        setErrorMessage(msg);
        return null;
      }
    },
    [mutation, queryClient],
  );

  return {
    open,
    setOpen,
    isPending: mutation.isPending,
    errorMessage,
    fallbackHint,
    initiate,
  };
}
