import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { tStub as t } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { EntityTable } from '@/components/observability/pages/entity-table';
import { ENTITY_COLUMNS } from '@/constants/observability-pages.constants';
import type { EntityTableProps } from '@/types/observability-pages.types';

import {
  FULL_EMAIL,
  modelObsRow,
  obsHealth,
  obsMetrics,
  obsRow,
  userObsRow,
} from './pages-fixtures';

function renderTable(
  overrides: Partial<EntityTableProps> & Pick<EntityTableProps, 'kind' | 'rows'>,
) {
  return render(
    <EntityTable
      sort="cost"
      order="desc"
      onSort={vi.fn()}
      onOpenUser={vi.fn()}
      sharedQuery="period=30d"
      t={t}
      {...overrides}
    />,
  );
}

describe('EntityTable users', () => {
  it('shows the full email, plan, role, status and the cost with its honesty label', () => {
    renderTable({ kind: 'users', rows: [userObsRow()] });
    expect(screen.getByText(FULL_EMAIL)).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.statusActive')).toBeInTheDocument();
    expect(screen.getByText('admin.roleUser')).toBeInTheDocument();
    expect(screen.getByText('$2.5000')).toBeInTheDocument();
    expect(document.body.textContent).toContain('observabilityExplorer.costPriced');
    expect(document.body.textContent).toContain(
      'observabilityPages.billingSplitCell|credit=2,allowance=4',
    );
  });

  it('translates every role and status, and shows an unknown one as the server sent it', () => {
    renderTable({
      kind: 'users',
      rows: [
        userObsRow({ key: 'u-a', userId: 'u-a', role: 'ADMIN', status: 'SUSPENDED' }),
        userObsRow({ key: 'u-b', userId: 'u-b', role: 'VIEWER', status: 'PENDING' }),
        userObsRow({ key: 'u-c', userId: 'u-c', role: 'AUDITOR', status: 'ARCHIVED' }),
        userObsRow({ key: 'u-d', userId: 'u-d', role: null, status: null }),
      ],
    });
    for (const text of [
      'admin.roleAdmin',
      'observabilityPages.statusSuspended',
      'admin.roleViewer',
      'observabilityPages.statusPending',
      'AUDITOR',
      'ARCHIVED',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('labels the users plan column as the CURRENT plan, and the plans table name as a plan', () => {
    const { unmount } = renderTable({ kind: 'users', rows: [userObsRow()] });
    expect(
      screen.getByRole('columnheader', { name: 'observabilityPages.colCurrentPlan' }),
    ).toBeInTheDocument();
    unmount();
    renderTable({ kind: 'plans', rows: [obsRow({ kind: 'PLAN', key: 'p-1', planName: 'Pro' })] });
    expect(
      screen.getByRole('columnheader', { name: 'observabilityPages.colPlan' }),
    ).toBeInTheDocument();
  });

  it('opens the user from the name', () => {
    const onOpenUser = vi.fn();
    renderTable({ kind: 'users', rows: [userObsRow()], onOpenUser });
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(onOpenUser).toHaveBeenCalledWith('user-1');
  });

  it('shows a masked address as given and never invents a full one', () => {
    renderTable({
      kind: 'users',
      rows: [userObsRow({ email: null, maskedEmail: 'ja***@example.com' })],
    });
    expect(screen.getByText('ja***@example.com')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(FULL_EMAIL);
  });

  it('says "no plan" for a user without one', () => {
    renderTable({ kind: 'users', rows: [userObsRow({ planName: null, planId: null })] });
    expect(screen.getByText('observabilityPages.noPlan')).toBeInTheDocument();
  });

  it('shows the cost the platform absorbed on the free allowance', () => {
    renderTable({ kind: 'plans', rows: [obsRow({ kind: 'PLAN', key: 'p-1', planName: 'Pro' })] });
    expect(screen.getByText('$0.1000')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'observabilityPages.colAllowanceCost' }),
    ).toBeInTheDocument();
  });

  it('shows cost per request, dates and active days', () => {
    renderTable({ kind: 'users', rows: [userObsRow()] });
    expect(screen.getByText('$0.2083')).toBeInTheDocument();
    expect(screen.getByText('2026-10-05 11:30')).toBeInTheDocument();
    expect(screen.getByText('2026-10-01 08:00')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01 00:00')).toBeInTheDocument();
  });
});

describe('EntityTable providers and models', () => {
  it('links a provider to its detail page, keeping the period', () => {
    renderTable({ kind: 'providers', rows: [obsRow()] });
    expect(screen.getByRole('link', { name: 'Gemini' })).toHaveAttribute(
      'href',
      '/observability/providers/GEMINI?period=30d',
    );
  });

  it('shows settle and refund rates and the p95 settle time, with dashes when there is no health', () => {
    renderTable({ kind: 'providers', rows: [obsRow({ health: obsHealth() })] });
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
    expect(screen.getByText('4.2 s')).toBeInTheDocument();
  });

  it('prints a dash, not zero, for a rate the server could not compute', () => {
    renderTable({ kind: 'providers', rows: [obsRow({ health: null })] });
    const row = screen.getAllByRole('row')[1] as HTMLElement;
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });

  it('links a model by provider and id in the query string, even with a slash and a colon', () => {
    renderTable({ kind: 'models', rows: [modelObsRow()] });
    expect(screen.getByRole('link', { name: 'ft:gpt-4o/mini' })).toHaveAttribute(
      'href',
      '/observability/models/detail?period=30d&provider=OPENAI&model=ft%3Agpt-4o%2Fmini',
    );
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('shows the cache hit rate and the share of cost', () => {
    renderTable({ kind: 'models', rows: [modelObsRow()] });
    expect(screen.getByText('8.3%')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });
});

describe('EntityTable plans and workflows', () => {
  it('links a plan to the users on that plan', () => {
    renderTable({
      kind: 'plans',
      rows: [obsRow({ key: 'plan-pro', kind: 'PLAN', planId: 'plan-pro', planName: 'Pro' })],
    });
    expect(
      screen.getByRole('link', { name: 'observabilityPages.openUsersOf|name=Pro' }),
    ).toHaveAttribute('href', '/observability/users?period=30d&plan=plan-pro');
  });

  it('links the no-plan group to users with plan NONE', () => {
    renderTable({ kind: 'plans', rows: [obsRow({ key: 'NONE', kind: 'PLAN', planId: null })] });
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/observability/users?period=30d&plan=NONE',
    );
    expect(screen.getByRole('link')).toHaveTextContent('observabilityPages.noPlan');
  });

  it('links a surface to its users and never calls an unknown one "chat"', () => {
    renderTable({
      kind: 'workflows',
      rows: [
        obsRow({ key: 'UNKNOWN', kind: 'WORKFLOW' }),
        obsRow({ key: 'CHAT', kind: 'WORKFLOW' }),
      ],
    });
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('observabilityExplorer.workflowUnknown');
    expect(links[0]).toHaveAttribute('href', '/observability/users?period=30d&workflow=UNKNOWN');
    expect(links[1]).toHaveTextContent('CHAT');
  });
});

describe('EntityTable headers', () => {
  it('makes only the server-sortable columns buttons, and announces the active sort', () => {
    renderTable({ kind: 'providers', rows: [obsRow()], sort: 'cost', order: 'asc' });
    expect(screen.getByRole('columnheader', { name: 'usageAnalytics.colCost' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(
      screen.queryByRole('button', { name: 'observabilityPages.colSettleRate' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'observabilityPages.colSettleRate' }),
    ).toBeInTheDocument();
  });

  it('sorts by the column key the server understands', () => {
    const onSort = vi.fn();
    renderTable({ kind: 'users', rows: [userObsRow()], onSort });
    fireEvent.click(screen.getByRole('button', { name: 'observabilityPages.colCostPerRequest' }));
    expect(onSort).toHaveBeenCalledWith('costPerRequest');
    fireEvent.click(screen.getByRole('button', { name: 'observabilityPages.colActiveDays' }));
    expect(onSort).toHaveBeenCalledWith('activeDays');
  });

  it('is plain text throughout when the order is fixed', () => {
    renderTable({ kind: 'users', rows: [userObsRow()], onSort: undefined, compact: true });
    expect(
      screen.queryByRole('button', { name: 'usageAnalytics.colCost' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'usageAnalytics.colCost' }),
    ).toBeInTheDocument();
  });

  it('keeps only the headline columns in a compact preview', () => {
    renderTable({ kind: 'providers', rows: [obsRow()], compact: true });
    expect(screen.queryByText('observabilityPages.colSettleRate')).not.toBeInTheDocument();
    expect(screen.getByText('usageAnalytics.colCost')).toBeInTheDocument();
  });

  it('has a column for every id it can render', () => {
    for (const kind of ['users', 'providers', 'models', 'plans', 'workflows'] as const) {
      const rows = {
        users: userObsRow({ metrics: obsMetrics() }),
        models: modelObsRow(),
        providers: obsRow(),
        plans: obsRow(),
        workflows: obsRow(),
      };
      const { unmount } = renderTable({ kind, rows: [rows[kind]] });
      expect(screen.getAllByRole('columnheader')).toHaveLength(ENTITY_COLUMNS[kind].length);
      unmount();
    }
  });
});
