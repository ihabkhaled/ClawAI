import type { AdminCreditConnectorUsage, AdminUsageModelLine } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UsageRangePicker } from '@/components/admin/usage-analytics/usage-range-picker';
import { UsageToolsList } from '@/components/admin/usage-analytics/usage-tools-list';
import { UserUsageCreditConnectorCard } from '@/components/admin/usage-analytics/user-usage-credit-connector-card';
import { UserUsageModelsTable } from '@/components/admin/usage-analytics/user-usage-models-table';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key} ${JSON.stringify(params)}`;

function model(overrides: Partial<AdminUsageModelLine> = {}): AdminUsageModelLine {
  return {
    provider: 'OPENAI',
    model: 'gpt-x',
    requests: 3,
    inputTokens: 1200,
    outputTokens: 300,
    weightedTokens: 1500,
    costMicroUsd: '1234567',
    creditRequests: 2,
    freeAllowanceRequests: 1,
    ...overrides,
  };
}

function credit(overrides: Partial<AdminCreditConnectorUsage> = {}): AdminCreditConnectorUsage {
  return {
    usedCreditConnectors: true,
    creditRequests: 2,
    freeAllowanceRequests: 4,
    walletMicroUsd: '500000',
    freeAllowance: {
      periodKey: '2026-10',
      limit: 10,
      used: 4,
      remaining: 6,
      resetsAt: '2026-11-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('UserUsageModelsTable', () => {
  it('shows model, connector, counts and exact micro-USD cost', () => {
    render(<UserUsageModelsTable models={[model()]} truncated={false} t={t} />);
    expect(screen.getByText('gpt-x')).toBeTruthy();
    expect(screen.getByText('OPENAI')).toBeTruthy();
    expect(screen.getByText('USD 1.234567')).toBeTruthy();
  });

  it('says so when nothing was used, and when the list was cut', () => {
    const { rerender } = render(<UserUsageModelsTable models={[]} truncated={false} t={t} />);
    expect(screen.getByText('usageAnalytics.modelsEmpty')).toBeTruthy();
    rerender(<UserUsageModelsTable models={[model()]} truncated t={t} />);
    expect(screen.getByText(/usageAnalytics.modelsTruncated/u)).toBeTruthy();
  });
});

describe('UsageToolsList', () => {
  it('labels known tools and shows unknown ones by code', () => {
    render(
      <UsageToolsList
        tools={[
          { tool: 'WEB_SEARCH', count: 5 },
          { tool: 'MYSTERY', count: 1 },
        ]}
        toolCallCount={7}
        heading="Tools"
        t={t}
      />,
    );
    expect(screen.getByText('usageAnalytics.tools.WEB_SEARCH')).toBeTruthy();
    expect(screen.getByText('MYSTERY')).toBeTruthy();
    expect(screen.getByText(/usageAnalytics.toolCallsTotal/u)).toBeTruthy();
  });
});

describe('UserUsageCreditConnectorCard', () => {
  it('shows used versus remaining free allowance with a meter', () => {
    render(<UserUsageCreditConnectorCard credit={credit()} t={t} />);
    expect(screen.getByText('usageAnalytics.creditUsedYes')).toBeTruthy();
    expect(screen.getByText(/usageAnalytics.freeUsage.*"remaining":6/u)).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('USD 0.500000')).toBeTruthy();
  });

  it('keeps unlimited and disabled apart', () => {
    const { rerender } = render(
      <UserUsageCreditConnectorCard
        credit={credit({
          freeAllowance: {
            periodKey: '2026-10',
            limit: null,
            used: 3,
            remaining: null,
            resetsAt: '2026-11-01T00:00:00.000Z',
          },
        })}
        t={t}
      />,
    );
    expect(screen.getByText(/usageAnalytics.freeUnlimited/u)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();

    rerender(
      <UserUsageCreditConnectorCard
        credit={credit({
          usedCreditConnectors: false,
          freeAllowance: {
            periodKey: '2026-10',
            limit: 0,
            used: 0,
            remaining: 0,
            resetsAt: '2026-11-01T00:00:00.000Z',
          },
        })}
        t={t}
      />,
    );
    expect(screen.getByText('usageAnalytics.creditUsedNo')).toBeTruthy();
    expect(screen.getByText('usageAnalytics.freeDisabled')).toBeTruthy();
  });
});

describe('UsageRangePicker', () => {
  it('marks the selection with aria-pressed and reports a change', () => {
    const onChange = vi.fn();
    render(
      <UsageRangePicker
        presets={[UsageRangePreset.Today, UsageRangePreset.Week]}
        value={UsageRangePreset.Today}
        onChange={onChange}
        t={t}
      />,
    );
    expect(
      screen
        .getByRole('button', { name: 'usageAnalytics.presetToday' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.presetWeek' }));
    expect(onChange).toHaveBeenCalledWith(UsageRangePreset.Week);
  });
});
