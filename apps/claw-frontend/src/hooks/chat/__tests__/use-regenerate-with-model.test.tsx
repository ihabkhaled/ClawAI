import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MODEL_AUTO_VALUE } from '@/constants';
import { RoutingMode } from '@/enums';
import { useRegenerateMessage } from '@/hooks/chat/use-regenerate-message';
import { useRegenerateWithModel } from '@/hooks/chat/use-regenerate-with-model';
import { encodeModelValue } from '@/utilities';

const mockRegenerateMessage = vi.fn();

vi.mock('@/hooks/chat/use-model-selector', () => ({
  useModelSelector: () => ({
    groups: [],
    groupedModels: [],
    isLoading: false,
    t: (key: string) => key,
  }),
}));
vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    regenerateMessage: (...args: unknown[]) => mockRegenerateMessage(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useRegenerateWithModel', () => {
  it('reads as an action: no current value, a "try again with" trigger', () => {
    const { result } = renderHook(() => useRegenerateWithModel({ onPick: vi.fn() }));

    expect(result.current.value).toBeNull();
    expect(result.current.placeholder).toBe('chat.regenerateWith.trigger');
  });

  it('maps the AUTO option to an AUTO regeneration', () => {
    const onPick = vi.fn();
    const { result } = renderHook(() => useRegenerateWithModel({ onPick }));

    act(() => result.current.onChange(MODEL_AUTO_VALUE));

    expect(onPick).toHaveBeenCalledWith({ routingMode: RoutingMode.AUTO });
  });

  it('maps a model option to a manual regeneration with both ids', () => {
    const onPick = vi.fn();
    const { result } = renderHook(() => useRegenerateWithModel({ onPick }));

    act(() => result.current.onChange(encodeModelValue('ANTHROPIC', 'claude-opus-5')));

    expect(onPick).toHaveBeenCalledWith({
      routingMode: RoutingMode.MANUAL_MODEL,
      provider: 'ANTHROPIC',
      model: 'claude-opus-5',
    });
  });

  it('ignores a cleared value', () => {
    const onPick = vi.fn();
    const { result } = renderHook(() => useRegenerateWithModel({ onPick }));

    act(() => result.current.onChange(null));

    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('useRegenerateMessage', () => {
  it('sends the chosen routing with the request', async () => {
    mockRegenerateMessage.mockResolvedValue({ id: 'm-1' });
    const { result } = renderHook(() => useRegenerateMessage('t-1'), { wrapper });

    act(() => result.current.regenerate('m-1', { routingMode: RoutingMode.AUTO }));

    await waitFor(() =>
      expect(mockRegenerateMessage).toHaveBeenCalledWith('m-1', { routingMode: RoutingMode.AUTO }),
    );
  });

  it('sends no choice for a plain regenerate, keeping the old behaviour', async () => {
    mockRegenerateMessage.mockResolvedValue({ id: 'm-1' });
    const { result } = renderHook(() => useRegenerateMessage('t-1'), { wrapper });

    act(() => result.current.regenerate('m-1'));

    await waitFor(() => expect(mockRegenerateMessage).toHaveBeenCalledWith('m-1', undefined));
  });
});
