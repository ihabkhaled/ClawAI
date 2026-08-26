import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SharedConnectorsSection } from '@/components/workspace/shared-connectors-section';
import type { SharedConnectorView } from '@/types/connector-grant.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.value !== undefined ? `${key}:${String(params.value)}` : key;

function makeShared(overrides: Partial<SharedConnectorView> = {}): SharedConnectorView {
  return {
    connectorId: 'c1',
    connectorName: 'My Jira',
    provider: 'JIRA',
    ownerUserId: 'owner-1',
    accessLevel: 'AI_ACTIONS' as SharedConnectorView['accessLevel'],
    grantedBy: 'owner-1',
    grantedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SharedConnectorsSection', () => {
  it('renders nothing while loading', () => {
    const { container } = render(
      <SharedConnectorsSection connectors={[]} isLoading isError={false} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on error', () => {
    const { container } = render(
      <SharedConnectorsSection connectors={[]} isLoading={false} isError t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no shared connectors', () => {
    const { container } = render(
      <SharedConnectorsSection connectors={[]} isLoading={false} isError={false} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each shared connector with its name, provider, and level badge', () => {
    render(
      <SharedConnectorsSection
        connectors={[makeShared()]}
        isLoading={false}
        isError={false}
        t={t}
      />,
    );
    expect(screen.getByText('My Jira')).toBeInTheDocument();
    expect(screen.getByText('JIRA')).toBeInTheDocument();
    expect(screen.getByText('connectorGrants.levelAiActions')).toBeInTheDocument();
    expect(screen.getByText('sharedConnectors.sharedBy:owner-1')).toBeInTheDocument();
  });

  it('links to the connector detail page', () => {
    render(
      <SharedConnectorsSection
        connectors={[makeShared({ connectorId: 'c42' })]}
        isLoading={false}
        isError={false}
        t={t}
      />,
    );
    expect(screen.getByRole('link', { name: 'My Jira' })).toHaveAttribute(
      'href',
      '/workspace/connectors/c42',
    );
  });

  it('shows the correct level label for READ_ONLY and FULL', () => {
    render(
      <SharedConnectorsSection
        connectors={[
          makeShared({
            connectorId: 'c1',
            accessLevel: 'READ_ONLY' as SharedConnectorView['accessLevel'],
          }),
          makeShared({
            connectorId: 'c2',
            accessLevel: 'FULL' as SharedConnectorView['accessLevel'],
          }),
        ]}
        isLoading={false}
        isError={false}
        t={t}
      />,
    );
    expect(screen.getByText('connectorGrants.levelReadOnly')).toBeInTheDocument();
    expect(screen.getByText('connectorGrants.levelFull')).toBeInTheDocument();
  });
});
