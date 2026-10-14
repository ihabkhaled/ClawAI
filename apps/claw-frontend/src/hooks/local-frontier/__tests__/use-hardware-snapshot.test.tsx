import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHardwareSnapshot } from '@/hooks/local-frontier/use-hardware-snapshot';

const getHardware = vi.fn();

vi.mock('@/repositories/local-frontier/local-frontier.repository', () => ({
  localFrontierRepository: { getHardware: () => getHardware() },
}));

function makeWrapper(client: QueryClient): (props: { children: ReactNode }) => ReactElement {
  return function Wrapper(props: { children: ReactNode }): ReactElement {
    return createElement(QueryClientProvider, { client }, props.children);
  };
}

describe('useHardwareSnapshot when llamacpp-service is absent', () => {
  beforeEach(() => {
    getHardware.mockReset();
    getHardware.mockRejectedValue(new Error('502'));
  });

  it('calls once, then does not call again when another page mounts it', async () => {
    const client = new QueryClient();
    const first = renderHook(() => useHardwareSnapshot(true), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(first.result.current.isError).toBe(true));
    first.unmount();

    const second = renderHook(() => useHardwareSnapshot(true), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(second.result.current.isError).toBe(true));

    expect(getHardware).toHaveBeenCalledTimes(1);
  });

  it('does not call at all while disabled', () => {
    renderHook(() => useHardwareSnapshot(false), { wrapper: makeWrapper(new QueryClient()) });

    expect(getHardware).not.toHaveBeenCalled();
  });
});
