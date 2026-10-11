import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelCostPriceBasisBadge } from '@/components/admin/model-costs/model-cost-price-basis-badge';
import { ModelCostUnpricedPanel } from '@/components/admin/model-costs/model-cost-unpriced-panel';
import {
  MODEL_PRICE_BASIS_HINT_KEYS,
  MODEL_PRICE_BASIS_LABEL_KEYS,
} from '@/constants/model-cost.constants';
import { ModelBillingMode, ModelBillingSource } from '@/enums/model-billing.enum';
import { ModelPriceBasis } from '@/enums/model-price-basis.enum';
import { ModelPricingSource } from '@/enums/model-pricing-source.enum';
import type { UnpricedModelRow, UseUnpricedModelCostsResult } from '@/types/model-cost.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t, locale: 'en', dir: 'ltr' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const row = (modelKey: string, inRegistry: boolean): UnpricedModelRow => ({
  provider: 'CUSTOM_X',
  modelKey,
  displayName: null,
  pricingSource: ModelPricingSource.UNPRICED,
  inRegistry,
});

const state = (overrides: Partial<UseUnpricedModelCostsResult>): UseUnpricedModelCostsResult => ({
  rows: [],
  total: 0,
  page: 1,
  totalPages: 1,
  search: '',
  onSearchChange: vi.fn(),
  onPreviousPage: vi.fn(),
  onNextPage: vi.fn(),
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  onRetry: vi.fn(),
  ...overrides,
});

const billing = () => ({
  mode: ModelBillingMode.CREDIT,
  source: ModelBillingSource.CONNECTOR,
  connectorId: 'c1',
});

const renderPanel = (unpriced: UseUnpricedModelCostsResult, onPrice = vi.fn()) =>
  render(
    <ModelCostUnpricedPanel unpriced={unpriced} onPrice={onPrice} resolveBilling={billing} t={t} />,
  );

describe('ModelCostUnpricedPanel', () => {
  it('shows a skeleton while loading and no table', () => {
    const { container } = renderPanel(state({ isLoading: true }));
    expect(container.querySelector('table')).toBeNull();
    expect(screen.queryByText('adminModelCosts.unpriced.emptyTitle')).toBeNull();
  });

  it('shows the error with a working retry', async () => {
    const onRetry = vi.fn();
    renderPanel(state({ isError: true, error: new Error('down'), onRetry }));
    expect(screen.getByRole('alert')).toHaveTextContent('down');
    await userEvent.click(screen.getByRole('button', { name: 'adminModelCosts.unpriced.retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the all-priced empty state when nothing is searched', () => {
    renderPanel(state({}));
    expect(screen.getByText('adminModelCosts.unpriced.emptyTitle')).toBeInTheDocument();
  });

  it('shows the no-match state when a search finds nothing', () => {
    renderPanel(state({ search: 'zzz' }));
    expect(screen.getByText('adminModelCosts.unpriced.noMatchTitle')).toBeInTheDocument();
    expect(screen.queryByText('adminModelCosts.unpriced.emptyTitle')).toBeNull();
  });

  it('marks models missing from the registry and opens the price dialog for a row', async () => {
    const onPrice = vi.fn();
    const rows = [row('in-reg', true), row('ghost', false)];
    renderPanel(state({ rows, total: 2 }), onPrice);

    expect(screen.getAllByTestId('not-in-registry').length).toBeGreaterThan(0);
    const buttons = screen.getAllByRole('button', {
      name: /adminModelCosts\.unpriced\.setPriceFor.*ghost/,
    });
    await userEvent.click(buttons[0] as HTMLElement);
    expect(onPrice).toHaveBeenCalledWith(rows[1]);
  });

  it('pages and disables the ends', async () => {
    const onNextPage = vi.fn();
    renderPanel(state({ rows: [row('a', true)], total: 60, page: 1, totalPages: 3, onNextPage }));
    const previous = screen.getByRole('button', { name: 'adminModelCosts.unpriced.previous' });
    expect(previous).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'adminModelCosts.unpriced.next' }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it('forwards typing to the search handler', async () => {
    const onSearchChange = vi.fn();
    renderPanel(state({ onSearchChange }));
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'adminModelCosts.unpriced.searchPlaceholder' }),
      'k',
    );
    expect(onSearchChange).toHaveBeenCalledWith('k');
  });
});

describe('ModelCostPriceBasisBadge', () => {
  it.each(Object.values(ModelPriceBasis))('maps %s to its label and tooltip', (basis) => {
    render(<ModelCostPriceBasisBadge basis={basis} t={t} />);
    const badge = screen.getByTestId('model-cost-price-basis');
    expect(badge).toHaveTextContent(MODEL_PRICE_BASIS_LABEL_KEYS[basis]);
    expect(badge).toHaveAttribute('title', MODEL_PRICE_BASIS_HINT_KEYS[basis]);
  });

  it('uses the three documented labels', () => {
    expect(MODEL_PRICE_BASIS_LABEL_KEYS).toEqual({
      PROVIDER_PUBLISHED: 'adminModelCosts.basis.providerPublished',
      ESTIMATED: 'adminModelCosts.basis.estimated',
      ADMIN_SET: 'adminModelCosts.basis.adminSet',
    });
  });

  it('renders nothing for a missing or unknown basis', () => {
    const { container, rerender } = render(<ModelCostPriceBasisBadge basis={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ModelCostPriceBasisBadge basis={undefined} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });
});
