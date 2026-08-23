'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import type { ModelExposureTableProps } from '@/types';

export function ModelExposureTable({
  visibleRows,
  selected,
  toggle,
  selectAllVisible,
  clearSelection,
  filters,
  setFilter,
  exposedCount,
  unexposedCount,
  impact,
  isLoading,
  isSaving,
  errorMessage,
  onApply,
  t,
}: ModelExposureTableProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-muted-foreground text-sm">
        {t('adminConnectors.exposure.counts')} {exposedCount} / {unexposedCount}
      </p>

      <div className="flex flex-wrap gap-3">
        <Input
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder={t('adminConnectors.exposure.searchPlaceholder')}
          className="max-w-xs"
        />
        <select
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          value={filters.exposedOnly === null ? '' : String(filters.exposedOnly)}
          onChange={(e) => {
            const raw = e.target.value;
            setFilter('exposedOnly', raw === '' ? null : raw === 'true');
          }}
        >
          <option value="">{t('adminConnectors.exposure.filterAll')}</option>
          <option value="true">{t('adminConnectors.exposure.filterExposed')}</option>
          <option value="false">{t('adminConnectors.exposure.filterUnexposed')}</option>
        </select>
      </div>

      {errorMessage !== null ? (
        <p className="text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('adminConnectors.exposure.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onApply(true)}
              disabled={isSaving || selected.size === 0}
            >
              {t('adminConnectors.exposure.exposeSelected')}
            </Button>
            {/* Deliberately shown before the action, not after: an operator
               cannot undo a removal for users who are mid-conversation. */}
            {impact.length > 0 ? (
              <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-xs">
                <p className="font-medium">{t('adminConnectors.exposure.impactWarning')}</p>
                <ul className="mt-1 grid grid-cols-1 gap-0.5">
                  {impact.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onApply(false)}
              disabled={isSaving || selected.size === 0}
            >
              {t('adminConnectors.exposure.unexposeSelected')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={selectAllVisible}>
              {t('adminConnectors.exposure.selectAllVisible')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
              {t('adminConnectors.exposure.clearSelection')}
            </Button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-left text-xs">
                <th className="w-8 pb-2" />
                <th className="pb-2">{t('adminConnectors.exposure.colModel')}</th>
                <th className="pb-2">{t('adminConnectors.exposure.colProvider')}</th>
                <th className="pb-2">{t('adminConnectors.exposure.colExposure')}</th>
                <th className="pb-2">{t('adminConnectors.exposure.colLifecycle')}</th>
                <th className="pb-2">{t('adminConnectors.exposure.colLastSeen')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.modelKey} className="border-border/50 border-b">
                  <td className="py-2">
                    <Checkbox
                      checked={selected.has(row.modelKey)}
                      onCheckedChange={() => toggle(row.modelKey)}
                    />
                  </td>
                  <td className="py-2">
                    <span>{row.displayName}</span>{' '}
                    {/* Two providers can offer the same display name; the
                       operator needs the identity that actually executes. */}
                    <span className="text-muted-foreground font-mono text-xs">{row.modelKey}</span>
                  </td>
                  <td className="py-2">{row.provider}</td>
                  <td className="py-2">
                    {row.exposure === ConnectorModelExposure.EXPOSED ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700">
                        {t('adminConnectors.exposure.exposed')}
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
                        {t('adminConnectors.exposure.unexposed')}
                      </span>
                    )}
                  </td>
                  <td className="py-2">{row.lifecycle}</td>
                  <td className="py-2">
                    {row.lastSeenAt === null ? (
                      <span className="text-muted-foreground text-xs">
                        {t('adminConnectors.exposure.neverSeen')}
                      </span>
                    ) : (
                      row.lastSeenAt
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
