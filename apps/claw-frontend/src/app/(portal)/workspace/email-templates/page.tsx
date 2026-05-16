'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { EmailTemplateDialog } from '@/components/email-templates/email-template-dialog';
import { EmailTemplateRow } from '@/components/email-templates/email-template-row';
import { Button } from '@/components/ui/button';
import { useEmailTemplatesPage } from '@/hooks/email-templates/use-email-templates-page';
import { useTranslation } from '@/lib/i18n';

export default function EmailTemplatesPage(): ReactElement {
  const { t } = useTranslation();
  const ctrl = useEmailTemplatesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('emailTemplates.page.title')}
        description={t('emailTemplates.page.description')}
        actions={<Button onClick={ctrl.startCreate}>{t('emailTemplates.page.create')}</Button>}
      />

      {ctrl.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('emailTemplates.page.loading')}</p>
      ) : null}

      {ctrl.isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {ctrl.error?.message ?? t('emailTemplates.page.error')}
        </p>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emailTemplates.page.empty')}</p>
      ) : null}

      {ctrl.templates.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {ctrl.templates.map((tpl) => (
            <EmailTemplateRow
              key={tpl.id}
              template={tpl}
              onEdit={ctrl.startEdit}
              onDelete={(id) => void ctrl.deleteTemplate(id)}
              isDeleting={ctrl.isDeleting}
              labels={{
                defaultBadge: t('emailTemplates.page.defaultBadge'),
                subjectLabel: t('emailTemplates.page.subjectLabel'),
                edit: t('emailTemplates.page.edit'),
                delete: t('emailTemplates.page.delete'),
                deleting: t('emailTemplates.page.deleting'),
              }}
            />
          ))}
        </div>
      ) : null}

      <EmailTemplateDialog
        draft={ctrl.draft}
        isSaving={ctrl.isSaving}
        saveError={ctrl.saveError}
        onUpdateField={ctrl.updateDraftField}
        onClose={ctrl.closeDraft}
        onSave={() => void ctrl.saveDraft()}
        labels={{
          createTitle: t('emailTemplates.dialog.createTitle'),
          editTitle: t('emailTemplates.dialog.editTitle'),
          nameLabel: t('emailTemplates.dialog.nameLabel'),
          namePlaceholder: t('emailTemplates.dialog.namePlaceholder'),
          subjectLabel: t('emailTemplates.dialog.subjectLabel'),
          subjectPlaceholder: t('emailTemplates.dialog.subjectPlaceholder'),
          bodyLabel: t('emailTemplates.dialog.bodyLabel'),
          bodyPlaceholder: t('emailTemplates.dialog.bodyPlaceholder'),
          defaultLabel: t('emailTemplates.dialog.defaultLabel'),
          save: t('emailTemplates.dialog.save'),
          saving: t('emailTemplates.dialog.saving'),
          cancel: t('emailTemplates.dialog.cancel'),
        }}
      />
    </div>
  );
}
