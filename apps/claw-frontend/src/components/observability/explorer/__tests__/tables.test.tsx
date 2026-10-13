import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CostCell } from '@/components/observability/explorer/cost-cell';
import { CostKindBadge } from '@/components/observability/explorer/cost-kind-badge';
import { GroupTable } from '@/components/observability/explorer/group-table';
import { UserRequestsTable } from '@/components/observability/explorer/user-requests-table';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';

import { FULL_EMAIL, groupRow, requestRow, tStub as t } from './explorer-fixtures';

describe('CostKindBadge', () => {
  it.each([
    [
      UsageCostKind.Priced,
      'observabilityExplorer.costPriced',
      'observabilityExplorer.costPricedTip',
    ],
    [
      UsageCostKind.Fallback,
      'observabilityExplorer.costFallback',
      'observabilityExplorer.costFallbackTip',
    ],
    [
      UsageCostKind.Unpriced,
      'observabilityExplorer.costUnpriced',
      'observabilityExplorer.costUnpricedTip',
    ],
    [
      UsageCostKind.Unmetered,
      'observabilityExplorer.costUnmetered',
      'observabilityExplorer.costUnmeteredTip',
    ],
  ])(
    'shows %s with its label and a tooltip that is also in the accessibility tree',
    (kind, label, tip) => {
      const { container } = render(<CostKindBadge kind={kind} t={t} />);
      const badge = container.querySelector('[data-cost-kind]');
      expect(badge).toHaveAttribute('data-cost-kind', kind);
      expect(badge).toHaveAttribute('title', tip);
      expect(badge?.textContent).toContain(label);
      expect(within(badge as HTMLElement).getByText(tip)).toHaveClass('sr-only');
    },
  );

  it('marks a partial cost as understating spend', () => {
    const { container } = render(<CostKindBadge kind={UsageCostKind.Priced} partial t={t} />);
    expect(container.querySelector('[data-cost-kind]')?.getAttribute('title')).toContain(
      'observabilityExplorer.costPartial',
    );
  });
});

describe('CostCell', () => {
  it('shows the amount and a badge for a priced cost', () => {
    render(<CostCell cost={{ costMicroUsd: '2500000', costKind: UsageCostKind.Priced }} t={t} />);
    expect(screen.getByText('$2.5000')).toBeInTheDocument();
  });

  it('shows an estimate as an amount labelled Estimated', () => {
    render(<CostCell cost={{ costMicroUsd: '1000000', costKind: UsageCostKind.Fallback }} t={t} />);
    expect(screen.getByText('$1.0000')).toBeInTheDocument();
    expect(document.body.textContent).toContain('observabilityExplorer.costFallback');
  });

  it('never prints $0 for an unpriced or unmetered cost', () => {
    const { container, rerender } = render(
      <CostCell cost={{ costMicroUsd: '0', costKind: UsageCostKind.Unpriced }} t={t} />,
    );
    expect(container.textContent).not.toContain('$0');
    expect(container.textContent).toContain('observabilityExplorer.costUnpriced');
    rerender(<CostCell cost={{ costMicroUsd: '0', costKind: UsageCostKind.Unmetered }} t={t} />);
    expect(container.textContent).not.toContain('$0');
    expect(container.textContent).toContain('observabilityExplorer.costUnmetered');
  });
});

describe('GroupTable', () => {
  it('shows one normalised provider label per row', () => {
    render(
      <GroupTable
        rows={[groupRow({ key: 'LOCAL_OLLAMA', providerLabel: 'Local Ollama' })]}
        firstColumnLabel="Provider"
        sort="cost"
        order="desc"
        onSort={vi.fn()}
        dimension={UsageLeaderboardDimension.Provider}
        t={t}
      />,
    );
    expect(screen.getByText('Local Ollama')).toBeInTheDocument();
    expect(screen.queryByText('LOCAL_OLLAMA')).not.toBeInTheDocument();
  });

  it('shows the UNKNOWN workflow as Unknown, not as Chat', () => {
    render(
      <GroupTable
        rows={[groupRow({ key: 'UNKNOWN' }), groupRow({ key: 'CHAT' })]}
        firstColumnLabel="Workflow"
        sort="cost"
        order="desc"
        onSort={vi.fn()}
        dimension={UsageLeaderboardDimension.Workflow}
        t={t}
      />,
    );
    expect(screen.getByText('observabilityExplorer.workflowUnknown')).toBeInTheDocument();
    expect(screen.getByText('CHAT')).toBeInTheDocument();
  });

  it('opens a user from the user dimension, with the full email', () => {
    const onOpenUser = vi.fn();
    render(
      <GroupTable
        rows={[groupRow({ key: 'user-9', userId: 'user-9', email: FULL_EMAIL })]}
        firstColumnLabel="User"
        sort="cost"
        order="desc"
        onSort={vi.fn()}
        onOpenUser={onOpenUser}
        dimension={UsageLeaderboardDimension.User}
        t={t}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(onOpenUser).toHaveBeenCalledWith('user-9');
    expect(screen.getByText(FULL_EMAIL)).toBeInTheDocument();
  });
});

describe('UserRequestsTable', () => {
  it('renders safe request metadata and sorts on the sortable columns', () => {
    const onSort = vi.fn();
    render(
      <UserRequestsTable
        requests={[requestRow()]}
        sort="time"
        order="desc"
        onSort={onSort}
        t={t}
      />,
    );
    expect(screen.getByText('gemini-x')).toBeInTheDocument();
    expect(screen.getByText('observabilityExplorer.billingCredit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.colTime' }));
    expect(onSort).toHaveBeenCalledWith('time');
  });

  it('renders plain headers (no sort buttons) for a fixed-order list', () => {
    render(<UserRequestsTable requests={[requestRow()]} sort="tokens" order="desc" t={t} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an unknown-workflow request as Unknown', () => {
    render(
      <UserRequestsTable
        requests={[requestRow({ workflow: 'UNKNOWN' })]}
        sort="time"
        order="desc"
        t={t}
      />,
    );
    expect(screen.getByText('observabilityExplorer.workflowUnknown')).toBeInTheDocument();
  });
});
