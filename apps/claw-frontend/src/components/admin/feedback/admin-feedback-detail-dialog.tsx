'use client';

import { FeedbackStatus } from '@claw/shared-types';
import type { ReactElement } from 'react';

import { AdminFeedbackAttachmentThumbnail } from '@/components/admin/feedback/admin-feedback-attachment-thumbnail';
import { AdminFeedbackDetailSection } from '@/components/admin/feedback/admin-feedback-detail-section';
import { AdminFeedbackHistoryList } from '@/components/admin/feedback/admin-feedback-history-list';
import { AdminFeedbackImageViewer } from '@/components/admin/feedback/admin-feedback-image-viewer';
import { AdminFeedbackMetaItem } from '@/components/admin/feedback/admin-feedback-meta-item';
import { AdminFeedbackStatusActions } from '@/components/admin/feedback/admin-feedback-status-actions';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminFeedbackDetailDialog } from '@/hooks/admin/feedback/use-admin-feedback-detail-dialog';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';
import type { AdminFeedbackDetailDialogProps } from '@/types/feedback-props.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';
import { feedbackStatusLabelKey, feedbackTypeLabelKey } from '@/utilities/feedback-label.utility';

// The dialog used to return null while the ticket loaded, so a click on a row
// did nothing visible until the request came back. It stays mounted now and
// shows its own loading state, and every label goes through the dictionary
// instead of the hardcoded English the first cut shipped with.
export function AdminFeedbackDetailDialog({
  ticketId,
  open,
  onOpenChange,
}: AdminFeedbackDetailDialogProps): ReactElement {
  const { t } = useTranslation();
  const {
    ticket,
    isLoading,
    changeStatus,
    isChanging,
    imagePreview,
    openImagePreview,
    closeImagePreview,
  } = useAdminFeedbackDetailDialog(ticketId);

  const fallback = t('feedback.admin.detail.notAvailable');
  const context = ticket?.pageContext;
  const viewport =
    context === undefined ||
    context.viewportWidth === undefined ||
    context.viewportHeight === undefined
      ? fallback
      : `${context.viewportWidth}×${context.viewportHeight}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:p-0">
          {isLoading || ticket === undefined ? (
            <>
              <DialogHeader className="border-b px-5 py-4 pe-14 text-start sm:px-6 sm:pe-14">
                <DialogTitle className="text-base">{t('common.loading')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 p-6" aria-busy="true">
                <span className="bg-muted block h-4 w-2/5 animate-pulse rounded" />
                <span className="bg-muted block h-4 w-3/5 animate-pulse rounded" />
                <span className="bg-muted block h-24 w-full animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="border-b px-5 py-4 pe-14 text-start sm:px-6 sm:pe-14">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {t('feedback.admin.detail.ticket', { ticketNumber: ticket.ticketNumber })}
                  </span>
                  <Badge variant={ticket.status === FeedbackStatus.OPEN ? 'default' : 'secondary'}>
                    {t(feedbackStatusLabelKey(ticket.status))}
                  </Badge>
                  <Badge variant="outline">{t(feedbackTypeLabelKey(ticket.type))}</Badge>
                </div>
                <DialogTitle className="text-lg">{ticket.title}</DialogTitle>
                {ticket.subject === undefined || ticket.subject.length === 0 ? null : (
                  <DialogDescription>{ticket.subject}</DialogDescription>
                )}
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AdminFeedbackMetaItem
                    label={t('feedback.admin.detail.reporter')}
                    value={
                      ticket.reporterName === undefined || ticket.reporterName.length === 0
                        ? ticket.reporterEmail
                        : `${ticket.reporterName} (${ticket.reporterEmail})`
                    }
                  />
                  <AdminFeedbackMetaItem
                    label={t('feedback.admin.detail.created')}
                    value={formatDateTimeSafe(ticket.createdAt)}
                  />
                  <AdminFeedbackMetaItem
                    label={t('feedback.admin.detail.updated')}
                    value={formatDateTimeSafe(ticket.updatedAt)}
                  />
                  {ticket.resolvedAt === undefined || ticket.resolvedAt === null ? null : (
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.resolved')}
                      value={formatDateTimeSafe(ticket.resolvedAt)}
                    />
                  )}
                  {ticket.closedAt === undefined || ticket.closedAt === null ? null : (
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.closed')}
                      value={formatDateTimeSafe(ticket.closedAt)}
                    />
                  )}
                </dl>

                <AdminFeedbackDetailSection title={t('feedback.admin.detail.description')}>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <MarkdownRenderer content={ticket.contentMarkdown} />
                  </div>
                </AdminFeedbackDetailSection>

                {ticket.attachments.length === 0 ? null : (
                  <AdminFeedbackDetailSection title={t('feedback.admin.detail.attachments')}>
                    <div className="flex flex-wrap gap-3">
                      {ticket.attachments.map((attachment) => (
                        <AdminFeedbackAttachmentThumbnail
                          key={attachment.fileId}
                          ticketId={ticketId}
                          attachment={attachment}
                          onOpen={openImagePreview}
                        />
                      ))}
                    </div>
                  </AdminFeedbackDetailSection>
                )}

                <AdminFeedbackDetailSection title={t('feedback.admin.detail.context')}>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.route')}
                      value={context?.route ?? fallback}
                      isMono
                    />
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.url')}
                      value={context?.url ?? fallback}
                      isMono
                    />
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.viewport')}
                      value={viewport}
                    />
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.appVersion')}
                      value={context?.appVersion ?? fallback}
                    />
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.locale')}
                      value={context?.locale ?? fallback}
                    />
                    <AdminFeedbackMetaItem
                      label={t('feedback.admin.detail.userAgent')}
                      value={context?.userAgent ?? fallback}
                      isMono
                    />
                  </dl>
                </AdminFeedbackDetailSection>

                {ticket.history.length === 0 ? null : (
                  <AdminFeedbackDetailSection title={t('feedback.admin.detail.history')}>
                    <AdminFeedbackHistoryList entries={ticket.history} />
                  </AdminFeedbackDetailSection>
                )}
              </div>

              <div className="bg-muted/30 flex justify-end border-t px-5 py-4 sm:px-6">
                <AdminFeedbackStatusActions
                  status={ticket.status}
                  isChanging={isChanging}
                  onChange={(next) => changeStatus({ status: next })}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {imagePreview === null ? null : (
        <AdminFeedbackImageViewer
          src={imagePreview.src}
          alt={imagePreview.alt}
          open
          onOpenChange={closeImagePreview}
        />
      )}
    </>
  );
}
