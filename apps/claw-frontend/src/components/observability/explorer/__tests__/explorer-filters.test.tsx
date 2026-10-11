import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExplorerFiltersForm } from '@/components/observability/explorer/explorer-filters';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';

import { filtersState, tStub as t } from './explorer-fixtures';

const OPTIONS = {
  providers: [{ value: 'GEMINI', label: 'Gemini' }],
  models: ['gemini-x'],
  workflows: ['CHAT', 'UNKNOWN'],
};

const state = filtersState;

describe('ExplorerFiltersForm', () => {
  it('offers the period presets and applies a preset at once', () => {
    const current = state();
    render(<ExplorerFiltersForm state={current} options={OPTIONS} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.presetMonth' }));
    expect(current.setPreset).toHaveBeenCalledWith(UsageRangePreset.Month);
    expect(screen.getByRole('button', { name: 'usageAnalytics.presetWeek' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('has a labelled control for each of provider, model, workflow and billing', () => {
    render(<ExplorerFiltersForm state={state()} options={OPTIONS} t={t} />);
    for (const key of ['filterProvider', 'filterModel', 'filterWorkflow', 'filterBilling']) {
      expect(screen.getByText(`observabilityExplorer.${key}`)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
  });

  it('shows the hours field for the hours preset and sends it with Apply', () => {
    const current = state({
      draft: { preset: UsageRangePreset.Hours, hours: 12, customFrom: '', customTo: '' },
    });
    render(<ExplorerFiltersForm state={current} options={OPTIONS} t={t} />);
    fireEvent.change(screen.getByLabelText('usageAnalytics.hoursLabel'), {
      target: { value: '36' },
    });
    expect(current.setHours).toHaveBeenCalledWith('36');
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.apply' }));
    expect(current.apply).toHaveBeenCalled();
  });

  it('shows the date fields for a custom period and announces a problem', () => {
    const current = state({
      draft: { preset: UsageRangePreset.Custom, hours: 24, customFrom: '', customTo: '' },
      issue: 'usageAnalytics.errorRangeMissing',
    });
    render(<ExplorerFiltersForm state={current} options={OPTIONS} t={t} />);
    fireEvent.change(screen.getByLabelText('usageAnalytics.fromLabel'), {
      target: { value: '2026-10-01' },
    });
    expect(current.setCustomFrom).toHaveBeenCalledWith('2026-10-01');
    expect(screen.getByRole('alert')).toHaveTextContent('usageAnalytics.errorRangeMissing');
    expect(screen.getByRole('button', { name: 'usageAnalytics.apply' })).toBeDisabled();
  });

  it('offers to clear the filters only when one is set', () => {
    const { rerender } = render(<ExplorerFiltersForm state={state()} options={OPTIONS} t={t} />);
    expect(
      screen.queryByRole('button', { name: 'observabilityExplorer.filtersClear' }),
    ).not.toBeInTheDocument();
    const current = state({
      filters: { provider: 'GEMINI', model: '', workflow: '', billing: '' },
    });
    rerender(<ExplorerFiltersForm state={current} options={OPTIONS} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.filtersClear' }));
    expect(current.clearFilters).toHaveBeenCalled();
  });
});
