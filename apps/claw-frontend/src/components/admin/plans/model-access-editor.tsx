'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { ModelAccessEditorProps } from '@/types';

export function ModelAccessEditor({
  rows,
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
                <div className="grid grid-cols-1 gap-1">
                  <label htmlFor={`provider-${row.rowKey}`} className="text-xs font-medium">
                    {t('adminPlans.modelAccess.provider')}
                  </label>
                  <Input
                    id={`provider-${row.rowKey}`}
                    value={row.provider}
                    onChange={(e) => updateRow(row.rowKey, 'provider', e.target.value)}
                    placeholder="anthropic"
                  />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <label htmlFor={`model-${row.rowKey}`} className="text-xs font-medium">
                    {t('adminPlans.modelAccess.model')}
                  </label>
                  <Input
                    id={`model-${row.rowKey}`}
                    value={row.model}
                    onChange={(e) => updateRow(row.rowKey, 'model', e.target.value)}
                    placeholder="claude-sonnet-4"
                  />
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
