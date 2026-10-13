import type { ReactElement, ReactNode } from 'react';
import { Suspense } from 'react';

import { ObservabilityShell } from '@/components/observability/pages/observability-shell';

/**
 * One frame (title, sub-navigation, period and filters) for every Observability
 * page. `useSearchParams` in the shell needs a Suspense boundary above it.
 */
export default function ObservabilityLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Suspense fallback={null}>
      <ObservabilityShell>{children}</ObservabilityShell>
    </Suspense>
  );
}
