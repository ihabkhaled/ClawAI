import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorProvider, ConnectorStatus } from '@/enums';
import { useConnectorFormState } from '@/hooks/connectors/use-connector-form-state';
import type { Connector, ConnectorFormStateReturn, CreateConnectorRequest } from '@/types';

type FormResult = { current: ConnectorFormStateReturn };

function renderForm(connector: Connector | null) {
  const onSubmit = vi.fn<(data: CreateConnectorRequest) => void>();
  const view = renderHook(() =>
    useConnectorFormState({ open: true, connector, onSubmit, onOpenChange: vi.fn() }),
  );
  return { onSubmit, result: view.result };
}

function fillCreateFields(result: FormResult): void {
  act(() => {
    result.current.onProviderSelect(ConnectorProvider.GROQ);
    result.current.setApiKey('provider-key');
  });
}

function submit(result: FormResult): void {
  // A real form submit, so handleSubmit gets a genuine React FormEvent.
  const view = render(
    createElement('form', { 'aria-label': 'connector', onSubmit: result.current.handleSubmit }),
  );
  fireEvent.submit(screen.getByRole('form', { name: 'connector' }));
  view.unmount();
}

function addRow(result: FormResult, name: string, value: string): void {
  act(() => {
    result.current.gatewayHeaders.addRow();
  });
  const id = result.current.gatewayHeaders.rows.at(-1)?.id ?? '';
  act(() => {
    result.current.gatewayHeaders.updateRow(id, { name, value });
  });
}

describe('useConnectorFormState — gateway headers (F092)', () => {
  it('omits gatewayHeaders when no row was added', () => {
    const { result, onSubmit } = renderForm(null);
    fillCreateFields(result);
    submit(result);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('gatewayHeaders');
  });

  it('sends the filled rows as a header record beside the API key', () => {
    const { result, onSubmit } = renderForm(null);
    fillCreateFields(result);
    addRow(result, 'x-portkey-config', 'cfg-1');
    submit(result);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      apiKey: 'provider-key',
      gatewayHeaders: { 'x-portkey-config': 'cfg-1' },
    });
  });

  it('blocks submit and flags the field when a row tries to set Authorization', () => {
    const { result, onSubmit } = renderForm(null);
    fillCreateFields(result);
    addRow(result, 'Authorization', 'Bearer x');
    submit(result);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.gatewayHeaders).toEqual(['invalid']);
  });

  it('sends {} on edit only when the admin asked to clear the stored headers', () => {
    const connector: Connector = {
      id: 'c1',
      name: 'Groq',
      provider: ConnectorProvider.GROQ,
      status: ConnectorStatus.HEALTHY,
      authType: 'API_KEY',
      isEnabled: true,
      defaultModelId: null,
      baseUrl: null,
      region: null,
      workspaceId: null,
      maskedApiKey: '****',
      createdAt: '2026-09-30T00:00:00.000Z',
      updatedAt: '2026-09-30T00:00:00.000Z',
    };
    const { result, onSubmit } = renderForm(connector);
    submit(result);
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('gatewayHeaders');

    act(() => {
      result.current.gatewayHeaders.setClearStored(true);
    });
    submit(result);
    expect(onSubmit.mock.calls[1]?.[0]).toMatchObject({ gatewayHeaders: {} });
  });

  it('removes a row', () => {
    const { result } = renderForm(null);
    addRow(result, 'x-a', 'v');
    const id = result.current.gatewayHeaders.rows[0]?.id ?? '';
    act(() => {
      result.current.gatewayHeaders.removeRow(id);
    });
    expect(result.current.gatewayHeaders.rows).toEqual([]);
  });
});
