'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { ModelAccessEditorProps } from '@/types';

export function ModelAccessEditor({
  rows,
  exposedModels,
  addRow,
  removeRow,
  updateRow,
  onSave,
  onCancel,
  isSaving,
  saveErrorMessage,
  t,
}: ModelAccessEditorProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4">
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t('adminPlans.modelAccess.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rows.map((row) => (
            <div
              key={row.rowKey}
              className="border-border grid grid-cols-1 gap-3 rounded-lg border p-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-1 gap-1 sm:col-span-2">
                  <label htmlFor={`deployment-${row.rowKey}`} className="text-xs font-medium">
                    {t('adminPlans.modelAccess.model')}
                  </label>
                  {/* Selection, not free text. Only deployments an administrator
                      has exposed are offered; anything else cannot be assigned
                      and the server refuses it anyway. A row already saved with
                      a model that is no longer exposed stays visible below so it
                      can be seen and removed, but it is never re-selectable. */}
                  <select
                    id={`deployment-${row.rowKey}`}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                    value={row.provider && row.model ? `${row.provider}/${row.model}` : ''}
                    onChange={(e) => {
                      const [provider, ...rest] = e.target.value.split('/');
                      updateRow(row.rowKey, 'provider', provider ?? '');
                      updateRow(row.rowKey, 'model', rest.join('/'));
                    }}
                  >
                    <option value="">{t('adminPlans.modelAccess.selectModel')}</option>
                    {(exposedModels ?? []).map((option) => (
                      <option
                        key={`${option.provider}/${option.modelKey}`}
                        value={`${option.provider}/${option.modelKey}`}
                      >
                        {option.displayName} — {option.provider}/{option.modelKey}
                      </option>
                    ))}
                  </select>
                  {row.provider &&
                  row.model &&
                  !(exposedModels ?? []).some(
                    (option) => option.provider === row.provider && option.modelKey === row.model,
                  ) ? (
                    <p className="text-destructive text-xs">
                      {t('adminPlans.modelAccess.noLongerExposed')} {row.provider}/{row.model}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.isAllowed}
                    onCheckedChange={(next) => updateRow(row.rowKey, 'isAllowed', next === true)}
                  />
                  {t('adminPlans.modelAccess.isAllowed')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.allowAsPrimary}
                    onCheckedChange={(next) =>
                      updateRow(row.rowKey, 'allowAsPrimary', next === true)
                    }
                  />
                  {t('adminPlans.modelAccess.allowAsPrimary')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.allowAsFallback}
                    onCheckedChange={(next) =>
                      updateRow(row.rowKey, 'allowAsFallback', next === true)
                    }
                  />
                  {t('adminPlans.modelAccess.allowAsFallback')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.allowAsJudge}
                    onCheckedChange={(next) => updateRow(row.rowKey, 'allowAsJudge', next === true)}
                  />
                  {t('adminPlans.modelAccess.allowAsJudge')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.allowInCompare}
                    onCheckedChange={(next) =>
                      updateRow(row.rowKey, 'allowInCompare', next === true)
                    }
                  />
                  {t('adminPlans.modelAccess.allowInCompare')}
                </label>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="grid grid-cols-1 gap-1">
                  <label htmlFor={`override-${row.rowKey}`} className="text-xs font-medium">
                    {t('adminPlans.modelAccess.dailyTokenLimitOverride')}
                  </label>
                  <Input
                    id={`override-${row.rowKey}`}
                    type="number"
                    min={0}
                    value={row.dailyTokenLimitOverride}
                    onChange={(e) =>
                      updateRow(row.rowKey, 'dailyTokenLimitOverride', e.target.value)
                    }
                    placeholder={t('adminPlans.modelAccess.noOverride')}
                    className="w-48"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRow(row.rowKey)}
                  aria-label={t('adminPlans.modelAccess.removeRow')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        {t('adminPlans.modelAccess.addRow')}
      </Button>

      {saveErrorMessage !== null ? (
        <p
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-sm"
          role="alert"
        >
          {saveErrorMessage}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? t('adminPlans.modelAccess.saving') : t('common.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
