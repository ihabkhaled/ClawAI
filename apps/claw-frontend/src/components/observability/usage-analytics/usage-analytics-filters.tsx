import type { ReactElement } from 'react';

import { UsageRangePicker } from '@/components/admin/usage-analytics/usage-range-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  OBSERVABILITY_USAGE_PRESETS,
  USAGE_HOUR_CHOICES,
  USAGE_MAX_HOURS,
} from '@/constants/usage-analytics.constants';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageAnalyticsFiltersProps } from '@/types/admin-usage-analytics.types';

/**
 * Period and user filters. Presets apply at once; hours, dates and user id are
 * edited and sent with Apply (Enter works too), so a half-typed value never
 * fires a query. Every input has a visible label and the error is announced.
 */
export function UsageAnalyticsFilters({ state, t }: UsageAnalyticsFiltersProps): ReactElement {
  const { draft, userIdDraft, issue } = state;

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

      <div className="flex flex-wrap items-end gap-3">
        {draft.preset === UsageRangePreset.Hours ? (
          <div className="space-y-1">
            <label htmlFor="usage-hours" className="text-xs font-medium">
              {t('usageAnalytics.hoursLabel')}
            </label>
            <Input
              id="usage-hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={USAGE_MAX_HOURS}
              value={draft.hours}
              error={issue !== null}
              className="w-32"
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
              <label htmlFor="usage-from" className="text-xs font-medium">
                {t('usageAnalytics.fromLabel')}
              </label>
              <Input
                id="usage-from"
                type="date"
                value={draft.customFrom}
                error={issue !== null}
                onChange={(event) => {
                  state.setCustomFrom(event.target.value);
                }}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="usage-to" className="text-xs font-medium">
                {t('usageAnalytics.toLabel')}
              </label>
              <Input
                id="usage-to"
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

        <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
          <label htmlFor="usage-user" className="text-xs font-medium">
            {t('usageAnalytics.userLabel')}
          </label>
          <Input
            id="usage-user"
            type="text"
            maxLength={64}
            autoComplete="off"
            value={userIdDraft}
            aria-describedby="usage-user-hint"
            onChange={(event) => {
              state.setUserIdDraft(event.target.value);
            }}
          />
          <p id="usage-user-hint" className="text-muted-foreground text-xs">
            {t('usageAnalytics.userHint')}
          </p>
        </div>

        <Button type="submit" size="sm" disabled={issue !== null}>
          {t('usageAnalytics.apply')}
        </Button>
        {userIdDraft === '' ? null : (
          <Button type="button" size="sm" variant="outline" onClick={state.clearUser}>
            {t('usageAnalytics.clearUser')}
          </Button>
        )}
      </div>

      {issue === null ? null : (
        <p role="alert" className="text-destructive text-xs">
          {t(issue)}
        </p>
      )}
    </form>
  );
}
