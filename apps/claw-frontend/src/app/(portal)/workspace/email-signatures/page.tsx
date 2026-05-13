'use client';

import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { EmailSignatureDialog } from '@/components/email-signatures/email-signature-dialog';
import { EmailSignatureRow } from '@/components/email-signatures/email-signature-row';
import { Button } from '@/components/ui/button';
import { useEmailSignaturesPage } from '@/hooks/email-signatures/use-email-signatures-page';
import { useTranslation } from '@/lib/i18n';

export default function EmailSignaturesPage(): ReactElement {
  const { t } = useTranslation();
  const ctrl = useEmailSignaturesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('emailSignatures.page.title')}
        description={t('emailSignatures.page.description')}
        actions={<Button onClick={ctrl.startCreate}>{t('emailSignatures.page.create')}</Button>}
      />

      {ctrl.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('emailSignatures.page.loading')}</p>
      ) : null}

      {ctrl.isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {ctrl.error?.message ?? t('emailSignatures.page.error')}
        </p>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.signatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emailSignatures.page.empty')}</p>
      ) : null}

      {ctrl.signatures.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {ctrl.signatures.map((sig) => (
            <EmailSignatureRow
              key={sig.id}
              signature={sig}
              onEdit={ctrl.startEdit}
              onDelete={(id) => void ctrl.deleteSignature(id)}
              isDeleting={ctrl.isDeleting}
              labels={{
                defaultBadge: t('emailSignatures.page.defaultBadge'),
                edit: t('emailSignatures.page.edit'),
                delete: t('emailSignatures.page.delete'),
                deleting: t('emailSignatures.page.deleting'),
              }}
            />
          ))}
        </div>
      ) : null}

      <EmailSignatureDialog
        draft={ctrl.draft}
        isSaving={ctrl.isSaving}
        saveError={ctrl.saveError}
        onUpdateField={ctrl.updateDraftField}
        onClose={ctrl.closeDraft}
        onSave={() => void ctrl.saveDraft()}
        labels={{
          createTitle: t('emailSignatures.dialog.createTitle'),
          editTitle: t('emailSignatures.dialog.editTitle'),
          nameLabel: t('emailSignatures.dialog.nameLabel'),
          namePlaceholder: t('emailSignatures.dialog.namePlaceholder'),
          bodyLabel: t('emailSignatures.dialog.bodyLabel'),
          bodyPlaceholder: t('emailSignatures.dialog.bodyPlaceholder'),
          defaultLabel: t('emailSignatures.dialog.defaultLabel'),
          save: t('emailSignatures.dialog.save'),
          saving: t('emailSignatures.dialog.saving'),
          cancel: t('emailSignatures.dialog.cancel'),
        }}
      />
    </div>
  );
}
