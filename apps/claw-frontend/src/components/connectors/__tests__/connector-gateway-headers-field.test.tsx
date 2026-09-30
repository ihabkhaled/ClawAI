import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorGatewayHeadersField } from '@/components/connectors/connector-gateway-headers-field';
import type { ConnectorGatewayHeadersState } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function state(
  overrides: Partial<ConnectorGatewayHeadersState> = {},
): ConnectorGatewayHeadersState {
  return {
    rows: [],
    addRow: vi.fn(),
    updateRow: vi.fn(),
    removeRow: vi.fn(),
    clearStored: false,
    setClearStored: vi.fn(),
    ...overrides,
  };
}

describe('ConnectorGatewayHeadersField', () => {
  it('masks header values and wires name, value and remove to the row id', () => {
    const gatewayHeaders = state({ rows: [{ id: 'r1', name: 'x-a', value: 'secret' }] });
    render(
      <ConnectorGatewayHeadersField
        isEditing={false}
        gatewayHeaders={gatewayHeaders}
        error={undefined}
      />,
    );

    const value = screen.getByLabelText('connectors.gatewayHeaderValue');
    expect(value).toHaveAttribute('type', 'password');

    fireEvent.change(screen.getByLabelText('connectors.gatewayHeaderName'), {
      target: { value: 'x-b' },
    });
    expect(gatewayHeaders.updateRow).toHaveBeenCalledWith('r1', { name: 'x-b' });

    fireEvent.change(value, { target: { value: 'next' } });
    expect(gatewayHeaders.updateRow).toHaveBeenCalledWith('r1', { value: 'next' });

    fireEvent.click(screen.getByRole('button', { name: 'connectors.removeGatewayHeader' }));
    expect(gatewayHeaders.removeRow).toHaveBeenCalledWith('r1');
  });

  it('adds a row', () => {
    const gatewayHeaders = state();
    render(
      <ConnectorGatewayHeadersField
        isEditing={false}
        gatewayHeaders={gatewayHeaders}
        error={undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /connectors\.addGatewayHeader/ }));
    expect(gatewayHeaders.addRow).toHaveBeenCalledTimes(1);
  });

  it('offers the clear option only when editing with no new rows', () => {
    const { rerender } = render(
      <ConnectorGatewayHeadersField isEditing={false} gatewayHeaders={state()} error={undefined} />,
    );
    expect(screen.queryByText('connectors.clearGatewayHeaders')).toBeNull();

    const gatewayHeaders = state();
    rerender(
      <ConnectorGatewayHeadersField isEditing gatewayHeaders={gatewayHeaders} error={undefined} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(gatewayHeaders.setClearStored).toHaveBeenCalledWith(true);
  });

  it('shows the translated error when the rows are invalid', () => {
    render(
      <ConnectorGatewayHeadersField
        isEditing={false}
        gatewayHeaders={state()}
        error={['invalid']}
      />,
    );
    expect(screen.getByText('connectors.gatewayHeadersInvalid')).toBeInTheDocument();
  });
});
