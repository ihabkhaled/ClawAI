import { Globe, Link2Off, RefreshCw, RotateCcw } from 'lucide-react';

import { PublicShareStatus } from '@/components/chat-shares/public-share-status';
import { PublicShareUrlField } from '@/components/chat-shares/public-share-url-field';
import { ShareIndexingControl } from '@/components/chat-shares/share-indexing-control';
import { SharePublicationWarning } from '@/components/chat-shares/share-publication-warning';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ShareChatDialogProps } from '@/types';

/**
 * Owner-facing share management. Pure render — every value and callback arrives
 * via props built by `useShareChatDialog`.
 *
 * Two states: not-yet-published shows the warning and a disabled publish button;
 * published shows the URL, the indexing control, the snapshot status, and the two
 * destructive actions. Both destructive actions go through a second confirmation
 * because both are irreversible for the owner.
 */
export function ShareChatDialog(props: ShareChatDialogProps): React.ReactElement {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        {props.error === null ? null : (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">
            {props.error}
          </p>
        )}

        {props.share === null ? (
          <div className="space-y-4">
            <SharePublicationWarning {...props.warningProps} />
            <Button
              type="button"
              className="w-full"
              onClick={props.onPublish}
              disabled={!props.warningProps.hasAcknowledged}
              isLoading={props.isPublishPending}
            >
              <Globe className="me-2 h-4 w-4" />
              {props.publishLabel}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <PublicShareUrlField {...props.urlFieldProps} />
            <ShareIndexingControl {...props.indexingProps} />
            <PublicShareStatus {...props.statusProps} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={props.onRefresh}
                isLoading={props.isRefreshPending}
              >
                <RefreshCw className="me-2 h-4 w-4" />
                {props.refreshLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={props.onRequestRegenerate}
                isLoading={props.isRegeneratePending}
              >
                <RotateCcw className="me-2 h-4 w-4" />
                {props.regenerateLabel}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={props.onRequestDisable}
              isLoading={props.isRevokePending}
            >
              <Link2Off className="me-2 h-4 w-4" />
              {props.disableLabel}
            </Button>
          </div>
        )}

        <ConfirmDialog {...props.confirmDialogProps} />
      </DialogContent>
    </Dialog>
  );
}
