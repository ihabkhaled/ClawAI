import type { ReactElement } from 'react';

import { UsageRangePicker } from '@/components/admin/usage-analytics/usage-range-picker';
import { FilterSelect } from '@/components/observability/explorer/filter-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BILLING_FILTER_OPTIONS } from '@/constants/observability-explorer.constants';
import {
  OBSERVABILITY_USAGE_PRESETS,
  USAGE_HOUR_CHOICES,
  USAGE_MAX_HOURS,
} from '@/constants/usage-analytics.constants';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { ExplorerFiltersFormProps } from '@/types/observability-explorer.types';
import { workflowLabel } from '@/utilities/observability-explorer.utility';

/**
 * Period and filters shared by every section (and reused inside the user
 * dialog). Presets and the selects apply at once; hours and custom dates are sent
 * with Apply so a half-typed value never fires a query. Every control has a
 * visible label and a validation problem is announced.
 */
export function ExplorerFiltersForm({ state, options, t }: ExplorerFiltersFormProps): ReactElement {
  const { draft, issue, filters } = state;
  const filtersActive = Object.values(filters).some((value) => value !== '');
  const all = t('observabilityExplorer.filterAll');

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        state.apply();
      }}
    >
      <UsageRangePicker
        presets={OBSERVABILITY_USAGE_PRESETS}
        value={draft.preset}
        onChange={state.setPreset}
        t={t}
      />

      <div className="grid grid-cols-1 items-end gap-3 sm:flex sm:flex-wrap">
        {draft.preset === UsageRangePreset.Hours ? (
          <div className="space-y-1">
            <label htmlFor="explorer-hours" className="text-xs font-medium">
              {t('usageAnalytics.hoursLabel')}
            </label>
            <Input
              id="explorer-hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={USAGE_MAX_HOURS}
              value={draft.hours}
              error={issue !== null}
              className="w-full sm:w-28"
              onChange={(event) => {
                state.setHours(event.target.value);
              }}
            />
            <div className="flex flex-wrap gap-1">
              {USAGE_HOUR_CHOICES.map((hours) => (
                <Button
                  key={hours}
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    state.setHours(String(hours));
                  }}
                >
                  {hours}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {draft.preset === UsageRangePreset.Custom ? (
          <>
            <div className="space-y-1">
              <label htmlFor="explorer-from" className="text-xs font-medium">
                {t('usageAnalytics.fromLabel')}
              </label>
              <Input
                id="explorer-from"
                type="date"
                value={draft.customFrom}
                error={issue !== null}
                onChange={(event) => {
                  state.setCustomFrom(event.target.value);
                }}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="explorer-to" className="text-xs font-medium">
                {t('usageAnalytics.toLabel')}
              </label>
              <Input
                id="explorer-to"
                type="date"
                value={draft.customTo}
                error={issue !== null}
                onChange={(event) => {
                  state.setCustomTo(event.target.value);
                }}
              />
            </div>
          </>
        ) : null}

        {draft.preset === UsageRangePreset.Hours || draft.preset === UsageRangePreset.Custom ? (
          <Button type="submit" size="sm" disabled={issue !== null}>
            {t('usageAnalytics.apply')}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-end gap-3 sm:flex sm:flex-wrap">
        <FilterSelect
          id="explorer-provider"
          label={t('observabilityExplorer.filterProvider')}
          value={filters.provider}
          allLabel={all}
          options={options.providers}
          onChange={(value) => {
            state.setFilter('provider', value);
          }}
        />
        <FilterSelect
          id="explorer-model"
          label={t('observabilityExplorer.filterModel')}
          value={filters.model}
          allLabel={all}
          options={options.models.map((model) => ({ value: model, label: model }))}
          onChange={(value) => {
            state.setFilter('model', value);
          }}
        />
        <FilterSelect
          id="explorer-workflow"
          label={t('observabilityExplorer.filterWorkflow')}
          value={filters.workflow}
          allLabel={all}
          options={options.workflows.map((workflow) => ({
            value: workflow,
            label: workflowLabel(workflow, t),
          }))}
          onChange={(value) => {
            state.setFilter('workflow', value);
          }}
        />
        <FilterSelect
          id="explorer-billing"
          label={t('observabilityExplorer.filterBilling')}
          value={filters.billing}
          allLabel={all}
          options={BILLING_FILTER_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey),
          }))}
          onChange={(value) => {
            state.setFilter('billing', value);
          }}
        />
        {filtersActive ? (
          <Button type="button" size="sm" variant="outline" onClick={state.clearFilters}>
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
