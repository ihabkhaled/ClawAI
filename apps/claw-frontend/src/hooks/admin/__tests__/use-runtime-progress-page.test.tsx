import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRuntimeProgressPage } from '@/hooks/admin/use-runtime-progress-page';

const mockGetOllamaProbeReport = vi.fn();
const mockGetLlamacppProbeReport = vi.fn();

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'admin', role: 'ADMIN' } }),
}));

vi.mock('@/repositories/runtime-progress/runtime-progress.repository', () => ({
  getOllamaProbeReport: () => mockGetOllamaProbeReport(),
  getLlamacppProbeReport: () => mockGetLlamacppProbeReport(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRuntimeProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not probe local runtime services when local AI is disabled', async () => {
    renderHook(() => useRuntimeProgressPage(false), { wrapper });

    await waitFor(() => {
      expect(mockGetOllamaProbeReport).not.toHaveBeenCalled();
      expect(mockGetLlamacppProbeReport).not.toHaveBeenCalled();
    });
  });
});
