import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GatewayConfigCard } from '@/components/admin/gateway-config-card';
import { BillingGateway } from '@/enums/billing.enum';
import type { GatewayAdminView } from '@/types/billing.types';

const gateway: GatewayAdminView = {
  gateway: BillingGateway.PAYPAL,
  isEnabled: true,
  mode: 'LIVE',
  fields: [
    { key: 'clientId', configured: true },
    { key: 'clientSecret', configured: true },
    { key: 'futureCredential', configured: false },
  ],
  options: { currency: 'USD', webhookUrl: 'https://example.com/paypal' },
  updatedAt: '2026-08-09T00:00:00.000Z',
};

describe('GatewayConfigCard', () => {
  it('renders localized credential labels without exposing backend field keys', () => {
    render(
      <GatewayConfigCard gateway={gateway} isSaving={false} onSave={vi.fn()} t={(key) => key} />,
    );

    expect(screen.getByText('adminGatewayConfig.fields.clientId')).toBeInTheDocument();
    expect(screen.getByText('adminGatewayConfig.fields.clientSecret')).toBeInTheDocument();
    expect(screen.getByText('adminGatewayConfig.fields.credential')).toBeInTheDocument();
    expect(screen.queryByText('clientSecret')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'adminGatewayConfig.enabled' })).toBeChecked();
  });

  it('keeps stored secrets blank and submits only newly entered credentials', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <GatewayConfigCard gateway={gateway} isSaving={false} onSave={onSave} t={(key) => key} />,
    );

    const clientId = screen.getByLabelText('adminGatewayConfig.fields.clientId');
    const clientSecret = screen.getByLabelText('adminGatewayConfig.fields.clientSecret');
    expect(clientId).toHaveValue('');
    expect(clientSecret).toHaveValue('');

    await user.type(clientId, 'replacement-client-id');
    await user.click(screen.getByRole('button', { name: 'adminGatewayConfig.save' }));

    expect(onSave).toHaveBeenCalledWith(BillingGateway.PAYPAL, {
      isEnabled: true,
      mode: 'LIVE',
      credentials: { clientId: 'replacement-client-id' },
      options: { currency: 'USD', webhookUrl: 'https://example.com/paypal' },
    });
  });
});
