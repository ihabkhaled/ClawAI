import { createContext, useContext } from 'react';

import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';

export const ObservabilityScopeContext = createContext<ObservabilityPagesContextValue | null>(null);

/**
 * The period, filters and URL writers shared by every Observability page. The
 * existing tab components take the `scope` it returns unchanged.
 */
export function useObservabilityScope(): ObservabilityPagesContextValue {
  const value = useContext(ObservabilityScopeContext);
  if (value === null) {
    throw new Error('useObservabilityScope must be used inside the Observability layout');
  }
  return value;
}
