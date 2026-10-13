import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ObservabilityScopeContext } from '@/hooks/observability/use-observability-scope';
import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';

import { scopeContext } from './pages-fixtures';

/** Renders under a fresh query client and an Observability scope, as the layout provides. */
export function renderInScope(
  ui: ReactElement,
  value: ObservabilityPagesContextValue = scopeContext(),
): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ObservabilityScopeContext.Provider value={value}>
          {children}
        </ObservabilityScopeContext.Provider>
      </QueryClientProvider>
    ),
  });
}
