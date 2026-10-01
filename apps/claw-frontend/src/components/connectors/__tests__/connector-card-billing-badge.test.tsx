import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorCard } from '@/components/connectors/connector-card';
import { ConnectorProvider, ConnectorStatus } from '@/enums';
import type { Connector } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function connector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: 'c1',
    name: 'Main',
    provider: ConnectorProvider.OPENAI,
    status: ConnectorStatus.HEALTHY,
    authType: 'API_KEY',
    isEnabled: true,
    defaultModelId: null,
    baseUrl: null,
    region: null,
    workspaceId: null,
    maskedApiKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const handlers = {
  onTest: vi.fn(),
  onSync: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  isTestPending: false,
  isSyncPending: false,
};

describe('ConnectorCard billing badge', () => {
  it('shows Credit for a credit connector', () => {
    render(<ConnectorCard connector={connector({ isPayAsYouGo: true })} {...handlers} />);
    expect(screen.getByTestId('connector-billing-badge')).toHaveTextContent(
      'connectors.creditBadge',
    );
  });

  it('shows Included otherwise', () => {
    render(<ConnectorCard connector={connector({ isPayAsYouGo: false })} {...handlers} />);
    expect(screen.getByTestId('connector-billing-badge')).toHaveTextContent(
      'connectors.includedBadge',
    );
  });
});
