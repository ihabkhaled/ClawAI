'use client';

import type { ReactElement } from 'react';

import { AutomationPreferenceRow } from '@/components/automation-preferences/automation-preference-row';
import { LearnedPreferencesPanel } from '@/components/automation-preferences/learned-preferences-panel';
import { PageHeader } from '@/components/common/page-header';
import { useAutomationPreferencesPage } from '@/hooks/automation-preferences/use-automation-preferences-page';
import { useTranslation } from '@/lib/i18n';

export default function AutomationPreferencesPage(): ReactElement {
  const { t } = useTranslation();
  const { preferences, isLoading, isError, error, isSaving, savePreference } =
    useAutomationPreferencesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('automationPreferences.page.title')}
        description={t('automationPreferences.page.description')}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('automationPreferences.page.loading')}</p>
      ) : null}

      {isError ? (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
          {error?.message ?? t('automationPreferences.page.error')}
        </p>
      ) : null}

      {!isLoading && !isError && preferences.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('automationPreferences.page.empty')}</p>
      ) : null}

      {preferences.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {preferences.map((preference) => (
            <AutomationPreferenceRow
              key={preference.actionKind}
              preference={preference}
              onSave={savePreference}
              isPending={isSaving}
              t={t}
            />
          ))}
        </div>
      ) : null}

      <LearnedPreferencesPanel t={t} />
    </div>
  );
}
