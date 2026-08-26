import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceObjectDetail } from '@/components/workspace/workspace-object-detail';
import type { WorkspaceObject, WorkspaceObjectLink } from '@/types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params !== undefined ? `${key}:${Object.values(params).map(String).join(',')}` : key;

function makeObject(overrides: Partial<WorkspaceObject> = {}): WorkspaceObject {
  return {
    id: 'obj-1',
    connectorId: 'conn-1',
    userId: 'user-1',
    externalId: 'ext-1',
    type: 'ISSUE',
    title: 'My Issue',
    content: null,
    url: null,
    authorId: null,
    provider: 'GITHUB',
    metadata: {},
    externalCreatedAt: null,
    externalUpdatedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  } as WorkspaceObject;
}

function makeLink(overrides: Partial<WorkspaceObjectLink> = {}): WorkspaceObjectLink {
  return {
    id: 'link-1',
    sourceObjectId: 'obj-1',
    targetObjectId: null,
    externalRef: 'https://github.com/org/repo/pull/42',
    linkType: 'GITHUB_PR_REFERENCE',
    confidence: 0.95,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('WorkspaceObjectDetail', () => {
  it('renders the title, provider, and type badges', () => {
    render(
      <WorkspaceObjectDetail
        object={makeObject()}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('My Issue')).toBeInTheDocument();
    expect(screen.getByText('GITHUB')).toBeInTheDocument();
    expect(screen.getByText('ISSUE')).toBeInTheDocument();
  });

  it('renders nothing under Related items when there are no links', () => {
    render(
      <WorkspaceObjectDetail
        object={makeObject()}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByText('workspaceObjectDetail.relatedItems')).not.toBeInTheDocument();
  });

  it('shows an unresolved outgoing link by its externalRef, with no link element', () => {
    const link = makeLink({ targetObjectId: null });
    render(
      <WorkspaceObjectDetail
        object={makeObject({ sourceLinks: [link] })}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceObjectDetail.relatedItems')).toBeInTheDocument();
    expect(screen.getByText('GITHUB_PR_REFERENCE')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/org/repo/pull/42')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });

  it('shows a resolved outgoing link as a link to the target object', () => {
    const link = makeLink({ targetObjectId: 'obj-2' });
    render(
      <WorkspaceObjectDetail
        object={makeObject({ sourceLinks: [link] })}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    const linkEl = screen.getByRole('link', { name: 'workspaceObjectDetail.viewRelatedItem' });
    expect(linkEl).toHaveAttribute('href', '/workspace/objects/obj-2');
  });

  it('shows an incoming (target) link as a link to the source object', () => {
    const link = makeLink({ id: 'link-2', sourceObjectId: 'obj-3', targetObjectId: 'obj-1' });
    render(
      <WorkspaceObjectDetail
        object={makeObject({ targetLinks: [link] })}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    const linkEl = screen.getByRole('link', { name: 'workspaceObjectDetail.viewRelatedItem' });
    expect(linkEl).toHaveAttribute('href', '/workspace/objects/obj-3');
  });

  it('renders both outgoing and incoming links together', () => {
    render(
      <WorkspaceObjectDetail
        object={makeObject({
          sourceLinks: [makeLink({ id: 'out-1', targetObjectId: 'obj-2' })],
          targetLinks: [
            makeLink({ id: 'in-1', sourceObjectId: 'obj-3', linkType: 'JIRA_REFERENCE' }),
          ],
        })}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    expect(
      screen.getAllByRole('link', { name: 'workspaceObjectDetail.viewRelatedItem' }),
    ).toHaveLength(2);
  });

  it('renders the confidence value for a link row', () => {
    const link = makeLink({ confidence: 0.9 });
    render(
      <WorkspaceObjectDetail
        object={makeObject({ sourceLinks: [link] })}
        isRefreshing={false}
        refreshError={null}
        onRefresh={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceObjectDetail.linkConfidence:0.90')).toBeInTheDocument();
  });
});
