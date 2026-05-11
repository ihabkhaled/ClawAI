import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WebhookDeliveryRow } from '@/components/admin/webhook-delivery-row';
import type { WebhookDelivery } from '@/types/webhook-delivery.types';

function makeDelivery(overrides: Partial<WebhookDelivery> = {}): WebhookDelivery {
  return {
    id: 'd1',
    provider: 'GITHUB',
    connectorId: 'qa-github-test',
    externalDeliveryId: null,
    eventType: null,
    signatureValid: false,
    signature: null,
    errorMessage: 'SIGNATURE_INVALID',
    ipAddress: '172.18.0.1',
    bodyBytes: 10,
    createdAt: '2026-05-09T08:57:57.838Z',
    processedAt: null,
    ...overrides,
  };
}

describe('WebhookDeliveryRow', () => {
  it('renders the rejected status when errorMessage is set', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery()}
        onReplay={vi.fn()}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminWebhooks.status.rejected')).toBeInTheDocument();
    expect(screen.getByText('SIGNATURE_INVALID')).toBeInTheDocument();
  });

  it('renders the accepted status when signature is valid', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery({ errorMessage: null, signatureValid: true })}
        onReplay={vi.fn()}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminWebhooks.status.accepted')).toBeInTheDocument();
  });

  it('renders idempotent status as default', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery({ errorMessage: null, signatureValid: false })}
        onReplay={vi.fn()}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminWebhooks.status.idempotent')).toBeInTheDocument();
  });

  it('renders a non-Invalid date for valid createdAt', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery()}
        onReplay={vi.fn()}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    // toLocaleString output varies by env; just ensure year shows up
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders processedAt row when set', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery({ processedAt: '2026-05-09T09:00:00.000Z' })}
        onReplay={vi.fn()}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminWebhooks.row.processedAt')).toBeInTheDocument();
  });

  it('invokes onReplay with the delivery id when clicked', async () => {
    const onReplay = vi.fn();
    const user = userEvent.setup();
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery()}
        onReplay={onReplay}
        isReplaying={false}
        t={(key) => key}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'adminWebhooks.replay' }));
    expect(onReplay).toHaveBeenCalledWith('d1');
  });

  it('shows replaying label and aria-busy when isReplaying is true', () => {
    render(
      <WebhookDeliveryRow
        delivery={makeDelivery()}
        onReplay={vi.fn()}
        isReplaying
        t={(key) => key}
      />,
    );
    const btn = screen.getByRole('button', { name: 'adminWebhooks.replay' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('adminWebhooks.replaying')).toBeInTheDocument();
  });
});
