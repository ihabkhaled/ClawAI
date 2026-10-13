import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { tStub as t } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { ObservabilityFilterBar } from '@/components/observability/pages/observability-filter-bar';

import { scopeContext } from './pages-fixtures';

const OPTIONS = {
  providers: [{ value: 'GEMINI', label: 'Gemini' }],
  models: ['gemini-x'],
  workflows: ['CHAT', 'UNKNOWN'],
  plans: [{ value: 'NONE', label: 'No plan' }],
};

describe('ObservabilityFilterBar', () => {
  it('is a labelled form with a pressed state on the active period', () => {
    render(<ObservabilityFilterBar scope={scopeContext('period=30d')} t={t} />);
    expect(
      screen.getByRole('form', { name: 'observabilityPages.filtersLabel' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'observabilityPages.period30d' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'observabilityPages.period7d' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('offers today, 24 hours, 7, 30 and 90 days and a custom range', () => {
    render(<ObservabilityFilterBar scope={scopeContext()} t={t} />);
    for (const key of ['Today', '24h', '7d', '30d', '90d', 'Custom']) {
      expect(
        screen.getByRole('button', { name: `observabilityPages.period${key}` }),
      ).toBeInTheDocument();
    }
  });

  it('applies a preset at once through the URL writer', () => {
    const scope = scopeContext();
    render(<ObservabilityFilterBar scope={scope} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'observabilityPages.period90d' }));
    expect(scope.setPeriod).toHaveBeenCalledWith('90d');
  });

  it('shows no date fields until the custom range is chosen', () => {
    render(<ObservabilityFilterBar scope={scopeContext('period=7d')} t={t} />);
    expect(screen.queryByLabelText('usageAnalytics.fromLabel')).not.toBeInTheDocument();
  });

  it('holds custom dates as a draft and sends them only on Apply, when valid', () => {
    const scope = scopeContext('period=custom');
    render(<ObservabilityFilterBar scope={scope} t={t} />);
    const apply = screen.getByRole('button', { name: 'usageAnalytics.apply' });
    expect(apply).toBeDisabled();

    fireEvent.change(screen.getByLabelText('usageAnalytics.fromLabel'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.change(screen.getByLabelText('usageAnalytics.toLabel'), {
      target: { value: '2026-09-01' },
    });
    expect(apply).toBeDisabled();
    expect(scope.setParams).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('usageAnalytics.toLabel'), {
      target: { value: '2026-10-05' },
    });
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    expect(scope.setParams).toHaveBeenCalledWith({
      period: 'custom',
      from: '2026-09-30',
      to: '2026-10-05',
    });
  });

  it('starts the custom fields from the dates already in the URL', () => {
    render(
      <ObservabilityFilterBar
        scope={scopeContext('period=custom&from=2026-09-01&to=2026-09-30')}
        t={t}
      />,
    );
    expect(screen.getByLabelText('usageAnalytics.fromLabel')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('usageAnalytics.toLabel')).toHaveValue('2026-09-30');
  });

  it('labels every filter and offers a clear button only while one is set', () => {
    const none = scopeContext('period=7d', { options: OPTIONS });
    const { rerender } = render(<ObservabilityFilterBar scope={none} t={t} />);
    for (const label of [
      'observabilityExplorer.filterProvider',
      'observabilityExplorer.filterModel',
      'observabilityPages.filterPlan',
      'observabilityExplorer.filterWorkflow',
      'observabilityExplorer.filterBilling',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(
      screen.queryByRole('button', { name: 'observabilityExplorer.filtersClear' }),
    ).not.toBeInTheDocument();

    const active = scopeContext('period=7d&plan=NONE', { options: OPTIONS });
    rerender(<ObservabilityFilterBar scope={active} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.filtersClear' }));
    expect(active.clearFilters).toHaveBeenCalled();
  });

  it('shows the provider and model filters by default, and hides them on a provider page', () => {
    const { rerender } = render(<ObservabilityFilterBar scope={scopeContext()} t={t} />);
    expect(screen.getByLabelText('observabilityExplorer.filterProvider')).toBeInTheDocument();
    expect(screen.getByLabelText('observabilityExplorer.filterModel')).toBeInTheDocument();
    rerender(<ObservabilityFilterBar scope={scopeContext()} hideProviderModel t={t} />);
    expect(screen.queryByLabelText('observabilityExplorer.filterProvider')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('observabilityExplorer.filterModel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('observabilityPages.filterPlan')).toBeInTheDocument();
    expect(screen.getByLabelText('observabilityExplorer.filterBilling')).toBeInTheDocument();
  });

  it('announces an invalid range', () => {
    const scope = scopeContext('period=custom', { issue: 'usageAnalytics.errorRangeMissing' });
    render(<ObservabilityFilterBar scope={scope} t={t} />);
    expect(screen.getByRole('alert')).toHaveTextContent('usageAnalytics.errorRangeMissing');
  });

  it('submits the form with Enter without reloading the page', () => {
    const scope = scopeContext('period=custom&from=2026-09-01&to=2026-09-30');
    render(<ObservabilityFilterBar scope={scope} t={t} />);
    const submitted = fireEvent.submit(
      screen.getByRole('form', { name: 'observabilityPages.filtersLabel' }),
    );
    expect(submitted).toBe(false);
    expect(scope.setParams).toHaveBeenCalledWith({
      period: 'custom',
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
