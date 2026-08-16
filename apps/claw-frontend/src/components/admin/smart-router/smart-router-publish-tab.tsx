import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SMART_ROUTER_STATUS_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import { useSmartRouterPublishConfirm } from '@/hooks/admin/use-smart-router-publish-confirm';
import type { SmartRouterPublishTabProps } from '@/types/smart-router-admin.types';

import { SmartRouterStatusBadge } from './smart-router-status-badge';

export function SmartRouterPublishTab({
  configuration,
  isLoading,
  currentlyPublished,
  isPublishable,
  isPending,
  onPublish,
  t,
}: SmartRouterPublishTabProps): React.ReactElement {
  const confirm = useSmartRouterPublishConfirm();

  if (isLoading) {
    return <LoadingSpinner label={t('common.loading')} />;
  }

  if (configuration === null) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('smartRouterAdmin.publish.emptySelection')}
      </p>
    );
  }

  const handleConfirm = (): void => {
    onPublish();
    confirm.close();
  };

  let statusMessage: React.ReactNode;
  if (!isPublishable) {
    statusMessage = t('smartRouterAdmin.publish.notDraftWarning', {
      status: t(SMART_ROUTER_STATUS_LABEL_KEYS[configuration.status]),
    });
  } else if (currentlyPublished === null) {
    statusMessage = t('smartRouterAdmin.publish.noCurrentPublished');
  } else {
    statusMessage = t('smartRouterAdmin.publish.supersedeWarning', {
      revision: currentlyPublished.revision,
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold">#{configuration.revision}</p>
          <SmartRouterStatusBadge status={configuration.status} t={t} />
        </div>

        <p className="text-muted-foreground text-sm">{statusMessage}</p>

        <Dialog
          open={confirm.isOpen}
          onOpenChange={(next) => (next ? confirm.open() : confirm.close())}
        >
          <DialogTrigger asChild>
            <Button type="button" disabled={!isPublishable || isPending}>
              {t('smartRouterAdmin.publish.confirmAction')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('smartRouterAdmin.publish.confirmTitle')}</DialogTitle>
              <DialogDescription>
                {t('smartRouterAdmin.publish.confirmDescription')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={confirm.close}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={isPending}>
                {t('smartRouterAdmin.publish.confirmAction')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
