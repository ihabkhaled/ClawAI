import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ModelCostFilterBar } from '@/components/admin/model-costs/model-cost-filter-bar';
import { ModelCostTable } from '@/components/admin/model-costs/model-cost-table';
import {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';
import { ModelPricingSource, ModelPricingSourceFilter } from '@/enums/model-pricing-source.enum';
import type { ModelCostCatalogRow } from '@/types/model-cost.types';

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

const row = (modelKey: string): ModelCostCatalogRow => ({
  provider: 'ANTHROPIC',
  modelKey,
  displayName: null,
  pricingSource: ModelPricingSource.PUBLISHED,
  inputPerMillionMicroUsd: 15_000_000,
  outputPerMillionMicroUsd: 75_000_000,
  cachedInputPerMillionMicroUsd: null,
  costClass: 'PREMIUM',
  isAdminOverride: false,
  version: 1,
  lastVerifiedAt: null,
});

describe('ModelCostTable billing column', () => {
  it('shows the model name and a credit badge in the desktop table', () => {
    const { container } = render(
      <ModelCostTable
        rows={[row('claude-a'), row('claude-b')]}
        onEdit={vi.fn()}
        resolveBilling={() => ({
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.CONNECTOR,
          connectorId: 'c1',
        })}
        t={t}
      />,
    );

    const table = within(container.querySelector('table') as HTMLTableElement);
    expect(table.getByText('adminModelCosts.table.model')).toBeInTheDocument();
    expect(table.getByText('adminModelCosts.billing.column')).toBeInTheDocument();
    expect(table.getAllByText('claude-a').length).toBeGreaterThan(0);
    expect(table.getAllByTestId('model-billing-badge')).toHaveLength(2);
  });
});

describe('ModelCostTable cell layout', () => {
  it('never breaks a provider name mid-word and end-aligns the source badge on touch', () => {
    const { container } = render(
      <ModelCostTable
        rows={[row('claude-a')]}
        onEdit={vi.fn()}
        resolveBilling={() => ({
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.CONNECTOR,
          connectorId: 'c1',
        })}
        t={t}
      />,
    );
    const table = container.querySelector('table') as HTMLTableElement;
    const provider = within(table).getByText('ANTHROPIC');
    expect(provider).not.toHaveClass('break-all');
    expect(provider).toHaveClass('break-words');
    const badgeWrap = within(table).getByText('adminModelCosts.table.pricingSource', {
      selector: 'th',
    });
    expect(badgeWrap).toBeInTheDocument();
    const wrap = table.querySelector('td div.flex-wrap.items-center') as HTMLElement;
    expect(wrap).toHaveClass('justify-start', 'touch:justify-end');
  });
});

describe('ModelCostFilterBar billing filter', () => {
  const baseProps = {
    sourceFilter: ModelPricingSourceFilter.ALL,
    counts: {
      [ModelPricingSource.PUBLISHED]: 1,
      [ModelPricingSource.DATED_FAMILY]: 0,
      [ModelPricingSource.PROVIDER_FALLBACK]: 0,
      [ModelPricingSource.LOCAL_FREE]: 0,
      [ModelPricingSource.UNPRICED]: 0,
    },
    totalCount: 1,
    search: '',
    onSourceFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    billingCounts: { [ModelBillingMode.CREDIT]: 1, [ModelBillingMode.INCLUDED]: 0 },
    t,
  };

  it('offers All / Credit / Included and a touch filter sheet', async () => {
    const onBillingFilterChange = vi.fn();
    render(
      <ModelCostFilterBar
        {...baseProps}
        billingFilter={ModelBillingFilter.ALL}
        onBillingFilterChange={onBillingFilterChange}
        activeFilterCount={0}
      />,
    );

    expect(screen.getByTestId('model-cost-filter-bar')).toHaveClass('touch:sticky');
    expect(screen.getByTestId('model-cost-filter-sheet-trigger')).toHaveClass(
      'hidden',
      'touch:inline-flex',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /adminModelCosts\.billing\.included/ }),
    );
    expect(onBillingFilterChange).toHaveBeenCalledWith(ModelBillingFilter.INCLUDED);
  });

  it('clears the billing filter along with the others', async () => {
    const onBillingFilterChange = vi.fn();
    render(
      <ModelCostFilterBar
        {...baseProps}
        billingFilter={ModelBillingFilter.CREDIT}
        onBillingFilterChange={onBillingFilterChange}
        activeFilterCount={1}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'adminModelCosts.filters.clear' }));
    expect(onBillingFilterChange).toHaveBeenCalledWith(ModelBillingFilter.ALL);
  });
});
