'use client';

import { useEffect } from 'react';

import { useModelExposure } from '@/hooks/admin/use-model-exposure';
import type { UseModelExposureResult } from '@/types/model-exposure.types';

// Mount wrapper around useModelExposure. The base hook deliberately does not
// fetch on its own — it is also driven by tests and by callers that load on
// demand — so the load-on-mount effect lives here rather than in a component,
// keeping the section's TSX a pure render.
export function useModelExposureSection(connectorId: string): UseModelExposureResult {
  const exposure = useModelExposure(connectorId);
  const { load } = exposure;

  useEffect(() => {
    if (connectorId === '') {
      return;
    }
    void load();
  }, [connectorId, load]);

  return exposure;
}
