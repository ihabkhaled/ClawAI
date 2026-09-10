'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { CrossTabLocaleSync } from '@/components/common/cross-tab-locale-sync';
import { PwaManager } from '@/components/common/pwa-manager';
import { Toaster } from '@/components/ui/toaster';
import { QUERY_STALE_DEFAULT_MS } from '@/constants/query-policy.constants';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import type { ProvidersProps } from '@/types';

export function Providers({
  children,
  initialLocale,
  initialDictionary,
}: ProvidersProps): React.ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No global `refetchInterval`. There used to be one at 10s, which
            // in TanStack v5 ignores `staleTime` and so polled every query in
            // the app unconditionally — including pure configuration, and
            // including endpoints that answer 502 on deployments where the
            // optional local runtimes are absent. Six hooks had already been
            // forced to opt out of it by hand.
            //
            // Polling is now opt-in per query, named by tier. See
            // `constants/query-policy.constants.ts` and rule 06.
            staleTime: QUERY_STALE_DEFAULT_MS,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <LocaleProvider initialLocale={initialLocale} initialDictionary={initialDictionary}>
      <CrossTabLocaleSync />
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <PwaManager />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
