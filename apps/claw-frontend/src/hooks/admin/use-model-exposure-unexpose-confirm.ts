import { useCallback, useState } from 'react';

import type {
  ConnectorModelRow,
  UseModelExposureUnexposeConfirmResult,
} from '@/types/model-exposure.types';

/**
 * Unexposing one model from its row menu asks first: it removes the model
 * from every plan, and users mid-conversation lose it. Exposing needs no ask.
 */
export function useModelExposureUnexposeConfirm(
  applyTo: (modelKeys: string[], exposed: boolean) => Promise<void>,
): UseModelExposureUnexposeConfirmResult {
  const [pending, setPending] = useState<ConnectorModelRow | null>(null);

  const confirm = useCallback((): void => {
    if (pending !== null) {
      void applyTo([pending.modelKey], false);
    }
    setPending(null);
  }, [applyTo, pending]);

  const onOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setPending(null);
    }
  }, []);

  return { pending, request: setPending, confirm, onOpenChange };
}
