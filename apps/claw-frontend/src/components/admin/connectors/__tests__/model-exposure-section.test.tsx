import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelExposureSection } from '@/components/admin/connectors/model-exposure-section';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import { ModelBillingMode, ModelBillingSource } from '@/enums/model-billing.enum';
import type {
  ConnectorModelRow,
  ModelExposureRowView,
  UseModelExposurePanelResult,
} from '@/types/model-exposure.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t, locale: 'en', dir: 'ltr' }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockPanel } = vi.hoisted(() => ({
  mockPanel: vi.fn<() => UseModelExposurePanelResult>(),
}));

vi.mock('@/hooks/admin/use-model-exposure-panel', () => ({
  useModelExposurePanel: () => mockPanel(),
}));

function makeRow(modelKey: string, exposure: ConnectorModelExposure): ConnectorModelRow {
  return {
    id: modelKey,
    connectorId: 'c1',
    provider: 'OPENROUTER',
    modelKey,
    displayName: `Model ${modelKey}`,
    lifecycle: 'ACTIVE',
    exposure,
    kind: ConnectorModelKind.CHAT,
    maxContextTokens: null,
    usageTier: 'STANDARD',
    syncedAt: '2026-09-25T11:30:44.256Z',
    lastSeenAt: '2026-09-25T11:30:44.256Z',
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: false,
    supportsVision: false,
    supportsAudio: false,
  };
}

function makeView(modelKey: string, exposure: ConnectorModelExposure): ModelExposureRowView {
  return {
    row: makeRow(modelKey, exposure),
    isSelected: false,
    isExposed: exposure === ConnectorModelExposure.EXPOSED,
    providerLabel: 'OpenRouter',
    billing: {
      mode: ModelBillingMode.CREDIT,
      source: ModelBillingSource.CONNECTOR,
      connectorId: 'c1',
    },
    lastSeenLabel: 'Sep 25, 2026, 11:30 AM',
    lifecycleLabelKey: 'adminConnectors.exposureUi.lifecycleActive',
    lifecycleBadgeClass: '',
  };
}

function makePanel(
  overrides: Partial<UseModelExposurePanelResult> = {},
): UseModelExposurePanelResult {
  return {
    t,
    items: [
      makeView('openrouter/a', ConnectorModelExposure.EXPOSED),
      makeView('openrouter/b', ConnectorModelExposure.UNEXPOSED),
    ],
    rowCount: 2,
    filteredCount: 2,
    hasMore: false,
    onShowMore: vi.fn(),
    filters: { search: '', provider: null, exposedOnly: null, kind: null },
    hasActiveFilters: false,
    onSearchChange: vi.fn(),
    onExposureFilterChange: vi.fn(),
    onResetFilters: vi.fn(),
    selectedCount: 0,
    selectAllState: false,
    onToggleSelectAll: vi.fn(),
    onToggleRow: vi.fn(),
    onSelectAllVisible: vi.fn(),
    onClearSelection: vi.fn(),
    exposedCount: 12,
    unexposedCount: 437,
    impact: [],
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    isPolicyError: false,
    onApply: vi.fn(),
    onExposeRow: vi.fn(),
    unexposeConfirm: { pending: null, request: vi.fn(), confirm: vi.fn(), onOpenChange: vi.fn() },
    ...overrides,
  };
}

beforeEach(() => {
  mockPanel.mockReturnValue(makePanel());
});

describe('ModelExposureSection layout switch', () => {
  // Same pointer-based switch as ResponsiveTable: a phone (or a tablet in
  // either orientation) gets cards, a mouse gets the table.
  it('renders cards on touch and the table on a fine pointer', () => {
    render(<ModelExposureSection connectorId="c1" />);

    expect(screen.getByTestId('model-exposure-card-list')).toHaveClass('hidden', 'touch:flex');
    expect(screen.getByTestId('model-exposure-table')).toHaveClass('touch:hidden', 'overflow-auto');
    expect(screen.getAllByTestId('model-exposure-card')).toHaveLength(2);
  });

  it('lays cards out one per row on a phone and two from sm', () => {
    render(<ModelExposureSection connectorId="c1" />);

    const list = within(screen.getByTestId('model-exposure-card-list')).getByRole('list');
    expect(list).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2');
  });

  it('keeps the table header sticky and start-aligned for RTL', () => {
    render(<ModelExposureSection connectorId="c1" />);

    const table = screen.getByTestId('model-exposure-table');
    expect(table.querySelector('thead')).toHaveClass('sticky', 'top-0');
    for (const th of Array.from(table.querySelectorAll('th')).slice(0, 7)) {
      expect(th).toHaveClass('text-start');
      expect(th).not.toHaveClass('text-left');
    }
  });
});

describe('ModelExposureSection content', () => {
  it('shows counts as interpolated stats, not concatenated text', () => {
    render(<ModelExposureSection connectorId="c1" />);

    expect(
      screen.getByText('adminConnectors.exposureUi.exposedStat:{"count":12}'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('adminConnectors.exposureUi.unexposedStat:{"count":437}'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/adminConnectors\.exposure\.counts/)).not.toBeInTheDocument();
  });

  it('shows the selected count and a labelled select-all checkbox in the header', () => {
    mockPanel.mockReturnValue(makePanel({ selectedCount: 3, selectAllState: 'indeterminate' }));
    render(<ModelExposureSection connectorId="c1" />);

    expect(
      screen.getByText('adminConnectors.exposureUi.selectedCount:{"count":3}'),
    ).toBeInTheDocument();
    const table = screen.getByTestId('model-exposure-table');
    expect(
      within(table).getByRole('checkbox', { name: 'adminConnectors.exposureUi.selectAllLabel' }),
    ).toHaveAttribute('data-state', 'indeterminate');
  });

  it('uses the design-system Select and labels the search box', () => {
    const { container } = render(<ModelExposureSection connectorId="c1" />);

    expect(container.querySelector('select')).toBeNull();
    expect(
      screen.getByRole('searchbox', { name: 'adminConnectors.exposureUi.searchLabel' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('model-exposure-filter')).toHaveAttribute(
      'aria-label',
      'adminConnectors.exposureUi.filterLabel',
    );
  });

  it('shows a credit badge and the localized last-seen per model', () => {
    render(<ModelExposureSection connectorId="c1" />);

    const table = screen.getByTestId('model-exposure-table');
    expect(within(table).getAllByTestId('model-billing-badge')[0]).toHaveAttribute(
      'data-billing-mode',
      ModelBillingMode.CREDIT,
    );
    expect(within(table).getAllByText('Sep 25, 2026, 11:30 AM')).toHaveLength(2);
    expect(within(table).queryByText(/T11:30:44/)).not.toBeInTheDocument();
  });

  it('places the impact warning below the action buttons, not between them', () => {
    mockPanel.mockReturnValue(makePanel({ selectedCount: 1, impact: ['openrouter/a'] }));
    render(<ModelExposureSection connectorId="c1" />);

    const bar = screen.getByTestId('model-exposure-bulk-bar');
    const impact = within(bar).getByTestId('model-exposure-impact');
    const buttonRow = within(bar).getByRole('button', {
      name: 'adminConnectors.exposure.exposeSelected',
    }).parentElement;
    expect(buttonRow).toHaveClass('flex-wrap');
    expect(buttonRow?.contains(impact)).toBe(false);
    expect(bar).toHaveClass('sticky');
  });

  it('applies the bulk action from the sticky bar', async () => {
    const onApply = vi.fn();
    mockPanel.mockReturnValue(makePanel({ selectedCount: 2, onApply }));
    render(<ModelExposureSection connectorId="c1" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'adminConnectors.exposure.unexposeSelected' }),
    );

    expect(onApply).toHaveBeenCalledWith(false);
  });

  it('hides the duplicated header when the route already renders one', () => {
    const { rerender } = render(<ModelExposureSection connectorId="c1" />);
    expect(screen.getAllByText('adminConnectors.exposure.description').length).toBeGreaterThan(0);

    rerender(<ModelExposureSection connectorId="c1" showHeader={false} />);

    expect(screen.queryByRole('heading', { name: 'adminConnectors.exposure.title' })).toBeNull();
  });
});

describe('ModelExposureSection states', () => {
  it('shows skeleton rows while loading', () => {
    mockPanel.mockReturnValue(makePanel({ isLoading: true, items: [] }));
    render(<ModelExposureSection connectorId="c1" />);

    expect(screen.getByTestId('model-exposure-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('model-exposure-table')).toBeNull();
  });

  it('explains an unsynced connector', () => {
    mockPanel.mockReturnValue(makePanel({ items: [], rowCount: 0, filteredCount: 0 }));
    render(<ModelExposureSection connectorId="c1" />);

    expect(screen.getByText('adminConnectors.exposureUi.emptyTitle')).toBeInTheDocument();
  });

  it('offers to clear filters when nothing matches', async () => {
    const onResetFilters = vi.fn();
    mockPanel.mockReturnValue(
      makePanel({ items: [], rowCount: 5, filteredCount: 0, onResetFilters }),
    );
    render(<ModelExposureSection connectorId="c1" />);

    expect(screen.getByText('adminConnectors.exposureUi.noMatchTitle')).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'adminConnectors.exposureUi.clearFilters',
      })[0] as HTMLElement,
    );
    expect(onResetFilters).toHaveBeenCalled();
  });

  it('pages a long list with Show more', async () => {
    const onShowMore = vi.fn();
    mockPanel.mockReturnValue(makePanel({ hasMore: true, filteredCount: 449, onShowMore }));
    render(<ModelExposureSection connectorId="c1" />);

    expect(
      screen.getByText('adminConnectors.exposureUi.shownOf:{"shown":2,"total":449}'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'adminConnectors.exposureUi.showMore' }),
    );
    expect(onShowMore).toHaveBeenCalled();
  });
});
