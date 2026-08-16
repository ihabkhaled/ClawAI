import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { SMART_ROUTER_LOW_CONFIDENCE_ACTION_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import type { SmartRouterRevisionDetailTabProps } from '@/types/smart-router-admin.types';

import { SmartRouterAddEntryForm } from './smart-router-add-entry-form';
import { SmartRouterChainEntryList } from './smart-router-chain-entry-list';
import { SmartRouterStatusBadge } from './smart-router-status-badge';

export function SmartRouterRevisionDetailTab({
  configuration,
  isLoading,
  isError,
  error,
  isEditable,
  isUpdatePending,
  onReorder,
  onRemove,
  onAdd,
  t,
}: SmartRouterRevisionDetailTabProps): React.ReactElement {
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

  if (configuration === null) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('smartRouterAdmin.revisionDetail.emptySelection')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <p className="text-xl font-bold tracking-tight">#{configuration.revision}</p>
            <SmartRouterStatusBadge status={configuration.status} t={t} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisionDetail.supersedesLabel')}
            </p>
            <p className="text-sm">
              {configuration.supersedesRevision === null
                ? t('smartRouterAdmin.revisionDetail.supersedesNone')
                : `#${configuration.supersedesRevision}`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisionDetail.totalDeadlineLabel')}
            </p>
            <p className="text-sm">{configuration.totalDeadlineMs}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisionDetail.maxAttemptsLabel')}
            </p>
            <p className="text-sm">{configuration.maxAttempts}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisionDetail.minConfidenceLabel')}
            </p>
            <p className="text-sm">{configuration.minConfidence}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.revisionDetail.lowConfidenceActionLabel')}
            </p>
            <p className="text-sm">
              {t(SMART_ROUTER_LOW_CONFIDENCE_ACTION_LABEL_KEYS[configuration.lowConfidenceAction])}
            </p>
          </div>
        </CardContent>
      </Card>

      {configuration.entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('smartRouterAdmin.chain.noEntries')}</p>
      ) : (
        <SmartRouterChainEntryList
          entries={configuration.entries}
          isEditable={isEditable}
          isUpdatePending={isUpdatePending}
          onReorder={onReorder}
          onRemove={onRemove}
          t={t}
        />
      )}
      {isEditable ? (
        <SmartRouterAddEntryForm onAdd={onAdd} isPending={isUpdatePending} t={t} />
      ) : null}
    </div>
  );
}
