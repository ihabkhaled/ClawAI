import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorProvider } from '@/enums';
import { useConnectorFormState } from '@/hooks/connectors/use-connector-form-state';
import type { Connector } from '@/types';

function render(connector: Connector | null = null, onSubmit = vi.fn()) {
  return renderHook(() =>
    useConnectorFormState({ open: true, connector, onSubmit, onOpenChange: vi.fn() }),
  );
}

const existing = {
  id: 'c1',
  name: 'Local',
  provider: ConnectorProvider.OLLAMA,
  status: 'HEALTHY',
  authType: 'NONE',
  isEnabled: true,
  defaultModelId: null,
  baseUrl: null,
  region: null,
  workspaceId: null,
  maskedApiKey: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as Connector;

describe('useConnectorFormState credit connector flag', () => {
  it('defaults the switch from the provider on create', () => {
    const { result } = render();
    expect(result.current.isCreditConnector).toBe(false);
    act(() => result.current.onProviderSelect(ConnectorProvider.OPENAI));
    expect(result.current.isCreditConnector).toBe(true);
    act(() => result.current.onProviderSelect(ConnectorProvider.OLLAMA));
    expect(result.current.isCreditConnector).toBe(false);
  });

  it('sends the admin override explicitly on create', () => {
    const onSubmit = vi.fn();
    const { result } = render(null, onSubmit);
    act(() => result.current.onProviderSelect(ConnectorProvider.OLLAMA));
    act(() => result.current.setName('Ollama Cloud'));
    act(() => result.current.setIsCreditConnector(true));
    act(() => result.current.handleSubmit({ preventDefault: vi.fn() } as never));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isPayAsYouGo: true }));
  });

  it('starts from the stored value on edit and does not reset it on provider changes', () => {
    const { result } = render({ ...existing, isPayAsYouGo: true });
    expect(result.current.isCreditConnector).toBe(true);
  });

  it('sends the current value when saving an edit', () => {
    const onSubmit = vi.fn();
    const { result } = render({ ...existing, isPayAsYouGo: true }, onSubmit);
    act(() => result.current.setIsCreditConnector(false));
    act(() => result.current.handleSubmit({ preventDefault: vi.fn() } as never));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isPayAsYouGo: false }));
  });
});
