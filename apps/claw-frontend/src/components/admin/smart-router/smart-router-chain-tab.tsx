import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import type { SmartRouterChainTabProps } from '@/types/smart-router-admin.types';

import { SmartRouterAddEntryForm } from './smart-router-add-entry-form';
import { SmartRouterChainEntryList } from './smart-router-chain-entry-list';

export function SmartRouterChainTab({
  configuration,
  isLoading,
  isError,
  error,
  isDraft,
  isUpdatePending,
  onReorder,
  onRemove,
  onAdd,
  onCreateDraft,
  isCreateDraftPending,
  t,
}: SmartRouterChainTabProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('common.loading')} />;
  }

  if (isError) {
    return (
      <div
        className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
        role="alert"
      >
        {error?.message ?? t('common.error')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {isDraft
            ? t('smartRouterAdmin.chain.draftInProgress')
            : t('smartRouterAdmin.chain.viewingPublishedReadOnly')}
        </p>
        {!isDraft ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCreateDraft}
            disabled={isCreateDraftPending}
          >
            {t('smartRouterAdmin.revisions.createDraft')}
          </Button>
        ) : null}
      </div>
      {!isDraft ? (
        <p className="text-muted-foreground text-xs">
          {t('smartRouterAdmin.chain.createDraftToEdit')}
        </p>
      ) : null}
      {configuration === null || configuration.entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.chain.noEntries')}</p>
      ) : (
        <SmartRouterChainEntryList
          entries={configuration.entries}
          isEditable={isDraft}
          isUpdatePending={isUpdatePending}
          onReorder={onReorder}
          onRemove={onRemove}
          t={t}
        />
      )}
      {isDraft ? <SmartRouterAddEntryForm onAdd={onAdd} isPending={isUpdatePending} t={t} /> : null}
    </div>
  );
}
