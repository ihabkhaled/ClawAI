import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorCreditField } from '@/components/connectors/connector-credit-field';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ConnectorCreditField', () => {
  it('shows the label, helper and switch state', () => {
    render(<ConnectorCreditField checked onCheckedChange={vi.fn()} error={undefined} />);
    expect(screen.getByRole('switch', { name: 'connectors.creditConnector' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByText('connectors.creditConnectorHelp')).toBeInTheDocument();
  });

  it('reports a toggle', () => {
    const onCheckedChange = vi.fn();
    render(
      <ConnectorCreditField checked={false} onCheckedChange={onCheckedChange} error={undefined} />,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('renders a field error', () => {
    render(<ConnectorCreditField checked={false} onCheckedChange={vi.fn()} error={['Bad']} />);
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });
});
