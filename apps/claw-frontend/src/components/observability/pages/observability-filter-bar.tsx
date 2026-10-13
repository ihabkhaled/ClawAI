import type { ReactElement } from 'react';

import { FilterSelect } from '@/components/observability/explorer/filter-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BILLING_FILTER_OPTIONS } from '@/constants/observability-explorer.constants';
import { OBSERVABILITY_PERIOD_OPTIONS } from '@/constants/observability-pages.constants';
import { useCustomRangeDraft } from '@/hooks/observability/use-custom-range-draft';
import type { ObservabilityFilterBarProps } from '@/types/observability-pages.types';
import { workflowLabel } from '@/utilities/observability-explorer.utility';
import { hasActiveFilters } from '@/utilities/observability-url.utility';

/**
 * The one period and filter bar above every Observability page. Everything it
 * sets lives in the URL. Presets and selects apply at once; custom dates are
 * sent with Apply so a half-typed date never fires a query.
 */
export function ObservabilityFilterBar({
  scope,
  hideProviderModel = false,
  t,
}: ObservabilityFilterBarProps): ReactElement {
  const { state, options, issue } = scope;
  const range = useCustomRangeDraft(scope);
  const all = t('observabilityExplorer.filterAll');

  return (
    <form
      className="space-y-3"
      aria-label={t('observabilityPages.filtersLabel')}
      onSubmit={(event) => {
        event.preventDefault();
        range.apply();
      }}
    >
      <div
        role="group"
        aria-label={t('usageAnalytics.rangeLabel')}
        className="flex flex-wrap gap-2"
      >
        {OBSERVABILITY_PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.period}
            type="button"
            size="sm"
            variant={option.period === state.period ? 'default' : 'outline'}
            aria-pressed={option.period === state.period}
            onClick={() => {
              scope.setPeriod(option.period);
            }}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      {range.active ? (
        <div className="grid grid-cols-1 items-end gap-3 sm:flex sm:flex-wrap">
          <div className="space-y-1">
            <label htmlFor="obs-from" className="text-xs font-medium">
              {t('usageAnalytics.fromLabel')}
            </label>
            <Input
              id="obs-from"
              type="date"
              value={range.from}
              error={issue !== null}
              onChange={(event) => {
                range.setFrom(event.target.value);
              }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="obs-to" className="text-xs font-medium">
              {t('usageAnalytics.toLabel')}
            </label>
            <Input
              id="obs-to"
              type="date"
              value={range.to}
              error={issue !== null}
              onChange={(event) => {
                range.setTo(event.target.value);
              }}
            />
          </div>
          <Button type="submit" size="sm" disabled={!range.draftValid}>
            {t('usageAnalytics.apply')}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-end gap-3 sm:flex sm:flex-wrap">
        {hideProviderModel ? null : (
          <>
            <FilterSelect
              id="obs-provider"
              label={t('observabilityExplorer.filterProvider')}
              value={state.provider}
              allLabel={all}
              options={options.providers}
              onChange={(value) => {
                scope.setFilter('provider', value);
              }}
            />
            <FilterSelect
              id="obs-model"
              label={t('observabilityExplorer.filterModel')}
              value={state.model}
              allLabel={all}
              options={options.models.map((model) => ({ value: model, label: model }))}
              onChange={(value) => {
                scope.setFilter('model', value);
              }}
            />
          </>
        )}
        <FilterSelect
          id="obs-plan"
          label={t('observabilityPages.filterPlan')}
          value={state.plan}
          allLabel={all}
          options={options.plans}
          onChange={(value) => {
            scope.setFilter('plan', value);
          }}
        />
        <FilterSelect
          id="obs-workflow"
          label={t('observabilityExplorer.filterWorkflow')}
          value={state.workflow}
          allLabel={all}
          options={options.workflows.map((workflow) => ({
            value: workflow,
            label: workflowLabel(workflow, t),
          }))}
          onChange={(value) => {
            scope.setFilter('workflow', value);
          }}
        />
        <FilterSelect
          id="obs-billing"
          label={t('observabilityExplorer.filterBilling')}
          value={state.billing}
          allLabel={all}
          options={BILLING_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey),
          }))}
          onChange={(value) => {
            scope.setFilter('billing', value);
          }}
        />
        {hasActiveFilters(state) ? (
          <Button type="button" size="sm" variant="outline" onClick={scope.clearFilters}>
            {t('observabilityExplorer.filtersClear')}
          </Button>
        ) : null}
      </div>

      {issue === null ? null : (
        <p role="alert" className="text-destructive text-xs">
          {t(issue)}
        </p>
      )}
    </form>
  );
}
