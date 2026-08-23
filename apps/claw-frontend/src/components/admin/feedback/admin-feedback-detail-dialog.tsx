'use client';

import { FeedbackStatus } from '@claw/shared-types';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdminFeedbackDetail } from '@/hooks/admin/feedback/use-admin-feedback-detail';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';
import { feedbackAdminRepository } from '@/repositories/feedback/feedback-admin.repository';
import type { AdminFeedbackDetailDialogProps } from '@/types/feedback-props.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';
import { feedbackStatusLabelKey, feedbackTypeLabelKey } from '@/utilities/feedback-label.utility';

import { AdminFeedbackImageViewer } from './admin-feedback-image-viewer';
import { AdminFeedbackStatusActions } from './admin-feedback-status-actions';

export function AdminFeedbackDetailDialog({
  ticketId,
  open,
  onOpenChange,
}: AdminFeedbackDetailDialogProps) {
  const { t } = useTranslation();
  const { ticket, isLoading, changeStatus, isChanging } = useAdminFeedbackDetail(ticketId);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);

  if (isLoading || ticket === undefined) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Ticket {ticket.ticketNumber}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={ticket.status === FeedbackStatus.OPEN ? 'default' : 'secondary'}>
                  {t(feedbackStatusLabelKey(ticket.status))}
                </Badge>
                <Badge variant="outline">{t(feedbackTypeLabelKey(ticket.type))}</Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{ticket.title}</h3>
              <p className="text-muted-foreground">{ticket.subject}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">{t('feedback.admin.detail.reporter')}:</span>{' '}
                {ticket.reporterName === undefined || ticket.reporterName.length === 0
                  ? ticket.reporterEmail
                  : `${ticket.reporterName} (${ticket.reporterEmail})`}
              </div>
              <div>
                <span className="font-medium">Created:</span> {formatDateTimeSafe(ticket.createdAt)}
              </div>
              {ticket.updatedAt && (
                <div>
                  <span className="font-medium">Updated:</span>{' '}
                  {formatDateTimeSafe(ticket.updatedAt)}
                </div>
              )}
              {ticket.resolvedAt && (
                <div>
                  <span className="font-medium">Resolved:</span>{' '}
                  {formatDateTimeSafe(ticket.resolvedAt)}
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <span className="font-medium">Closed:</span> {formatDateTimeSafe(ticket.closedAt)}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-2 font-semibold">Page & Device Metadata</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="font-medium">Route:</dt>
                  <dd>{ticket.pageContext?.route || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">URL:</dt>
                  <dd className="truncate">{ticket.pageContext?.url || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Viewport:</dt>
                  <dd>
                    {`${ticket.pageContext?.viewportWidth ?? 0}×${ticket.pageContext?.viewportHeight ?? 0}` ||
                      'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">App Version:</dt>
                  <dd>{ticket.pageContext?.appVersion || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">User Agent:</dt>
                  <dd className="truncate">{ticket.pageContext?.userAgent || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Locale:</dt>
                  <dd>{ticket.pageContext?.locale || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-2 font-semibold">Description</h4>
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer content={ticket.contentMarkdown} />
              </div>
            </div>

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-2 font-semibold">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((attachment) => (
                    <Button
                      key={attachment.fileId}
                      variant="outline"
                      className="h-auto p-2"
                      onClick={() =>
                        setImagePreview({
                          src: feedbackAdminRepository.attachmentPath(ticketId, attachment.fileId),
                          alt: attachment.filename,
                        })
                      }
                    >
                      <img
                        src={feedbackAdminRepository.attachmentPath(ticketId, attachment.fileId)}
                        alt={attachment.filename}
                        className="h-16 w-16 rounded object-cover"
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {ticket.history && ticket.history.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-2 font-semibold">History</h4>
                <ul className="space-y-2 text-sm">
                  {ticket.history.map((entry) => (
                    <li key={`${entry.action}-${entry.at}`} className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {entry.action}
                      </Badge>
                      <span className="text-muted-foreground">
                        {entry.fromStatus === null ? '' : `${entry.fromStatus} → `}
                        {entry.toStatus} · {entry.actorEmail} · {formatDateTimeSafe(entry.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end border-t pt-4">
              <AdminFeedbackStatusActions
                status={ticket.status}
                isChanging={isChanging}
                onChange={(next) => changeStatus({ status: next })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {imagePreview && (
        <AdminFeedbackImageViewer
          src={imagePreview.src}
          alt={imagePreview.alt}
          open={!!imagePreview}
          onOpenChange={(open) => {
            if (!open) {
              setImagePreview(null);
            }
          }}
        />
      )}
    </>
  );
}
