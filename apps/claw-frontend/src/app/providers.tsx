'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import type { ProvidersProps } from '@/types';

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchInterval: 10 * 1000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <LocaleProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
