import { Check, EyeOff, Pencil, Rocket, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadChangeRequests } from '@/components/threads/thread-change-requests';
import { ThreadErrorNotice } from '@/components/threads/thread-error-notice';
import { ThreadExportPanel } from '@/components/threads/thread-export-panel';
import { ThreadGenerationProgressPanel } from '@/components/threads/thread-generation-progress-panel';
import { ThreadLiveBanner } from '@/components/threads/thread-live-banner';
import { ThreadSafetyBlockNotice } from '@/components/threads/thread-safety-block-notice';
import { ThreadShareMenu } from '@/components/threads/thread-share-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { THREAD_OWNER_EXPORT_OPTIONS } from '@/constants/thread-publication.constants';
import { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';
import { ThreadRevisionField } from '@/enums/thread-revision-field.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadPublicationDetailProps } from '@/types/thread-generation-progress.types';
import {
  isThreadNotFoundError,
  resolveThreadErrorMessage,
} from '@/utilities/thread-error-message.utility';
import { threadHeadlineKey } from '@/utilities/thread-generation-progress.utility';

/**
 * One publication, after generation starts: progress, draft preview, capped
 * edits, approve and publish, unpublish, export and reader suggestions. Pure
 * render; `useThreadPublicationDetail` owns every query and mutation.
 */
export function ThreadPublicationDetail({
  detail,
}: ThreadPublicationDetailProps): ReactElement | null {
  const { t } = useTranslation();
  const {
    generation,
    revisionReview,
    cancel,
    publish,
    editRevision,
    unpublish,
    selectedPublication,
    editingRevision,
    activeRevisionId,
  } = detail;
  const draft = generation.data?.draft;
  const stageLabelKey = generation.data
    ? threadHeadlineKey(generation.data.status, generation.data.stage)
    : null;
  const isPublished = selectedPublication?.status === ThreadPublicationStatus.Published;
  const canEdit =
    Boolean(draft) &&
    !editingRevision &&
    (!activeRevisionId || detail.revisionIsTerminal || revisionReview.isError);
  const canApprove =
    generation.data?.status === 'WAITING_FOR_REVIEW' &&
    Boolean(draft) &&
    Boolean(activeRevisionId ? revisionReview.data?.ready : detail.publicationReady) &&
    !publish.isSuccess;
  const canUnpublish = isPublished && !unpublish.isSuccess;

  return (
    <>
      {generation.isFetching && !generation.data ? (
        <p role="status">{t('common.loading')}</p>
      ) : null}
      <ThreadGenerationProgressPanel
        publicationId={detail.publicationId}
        canDelete={!isPublished}
        onCancel={() => cancel.mutate()}
        isCancelling={cancel.isPending}
      />
      {generation.isError && !isThreadNotFoundError(generation.error) ? (
        <ThreadErrorNotice message={resolveThreadErrorMessage(generation.error)} />
      ) : null}
      {generation.data ? (
        <section
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-5"
          aria-live="polite"
        >
          {detail.hasDraft ? (
            <h2 className="text-lg font-semibold">{t('chat.threadDraftPreview')}</h2>
          ) : null}
          {detail.generationCancelled && !detail.hasDraft ? (
            <p role="status">{t('chat.threadGenerationCancelled')}</p>
          ) : null}
          {cancel.isPending ? <p role="status">{t('chat.threadCancellationRequesting')}</p> : null}
          {cancel.isSuccess ? <p role="status">{t('chat.threadCancellationRequested')}</p> : null}
          {cancel.isError ? <p role="alert">{t('chat.threadCancellationFailed')}</p> : null}
          {!detail.generationFailed && !detail.generationCancelled && !detail.hasDraft ? (
            <p role="status" data-testid="thread-generation-stage" data-tour="thread-review-status">
              {stageLabelKey === null ? t('common.loading') : t(stageLabelKey)}
              {generation.data.round > 0
                ? ` · ${t('chat.threadStageRound', { round: String(generation.data.round) })}`
                : ''}
            </p>
          ) : null}
          {draft ? (
            <>
              <h3 className="font-medium" data-tour="thread-review-draft">
                {t('chat.threadDraftPreview')}
              </h3>
              <Textarea
                readOnly
                rows={18}
                value={draft.markdown}
                aria-label={t('chat.threadDraftPreview')}
                data-testid="thread-draft-preview"
                className="bg-muted/30 max-h-[32rem] font-mono"
              />
              <h3 className="font-medium">{t('chat.threadCitations')}</h3>
              <ul className="list-inside list-disc">
                {draft.citations.map(({ evidenceId, url }) => (
                  <li key={evidenceId} className="break-all">
                    <a
                      className="text-primary underline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {generation.data.safetyBlock ? (
            <ThreadSafetyBlockNotice block={generation.data.safetyBlock} />
          ) : null}
          {editingRevision ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                editRevision.mutate();
              }}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="thread-revision-markdown" className="text-sm font-medium">
                  {t('chat.threadRevisionContent')}
                </label>
                <Textarea
                  id="thread-revision-markdown"
                  required
                  maxLength={100000}
                  value={detail.revisionMarkdown}
                  onChange={(event) =>
                    detail.changeRevisionField(ThreadRevisionField.Markdown, event.target.value)
                  }
                  className="min-h-64"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="thread-revision-cap" className="text-sm font-medium">
                  {t('chat.threadRevisionCap')}
                </label>
                <Input
                  id="thread-revision-cap"
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={detail.revisionCapUsd}
                  onChange={(event) =>
                    detail.changeRevisionField(ThreadRevisionField.Cap, event.target.value)
                  }
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {t('chat.threadRevisionReviewDisclosure')}
              </p>
              {editRevision.isError ? (
                <ThreadErrorNotice message={resolveThreadErrorMessage(editRevision.error)} />
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="submit"
                  disabled={editRevision.isPending}
                  isLoading={editRevision.isPending}
                  className="w-full sm:w-auto"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t('chat.threadSubmitRevision')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => detail.setEditingRevision(false)}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : null}
          {activeRevisionId ? (
            <p role="status">
              {t('chat.threadRevisionStatus')}: {detail.revisionReviewMessage}
            </p>
          ) : null}
          {revisionReview.isError ? (
            <ThreadErrorNotice message={resolveThreadErrorMessage(revisionReview.error)} />
          ) : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          draft &&
          !detail.publicationReady &&
          !publish.isSuccess ? (
            <p role="status">{t('chat.threadDraftNotEligible')}</p>
          ) : null}
          {publish.isSuccess && detail.publicUrl !== null ? (
            <ThreadLiveBanner url={detail.publicUrl} />
          ) : null}
          {publish.isSuccess && detail.publicUrl === null ? (
            <p role="status">{t('chat.threadPublished')}</p>
          ) : null}
          {canEdit || canApprove || canUnpublish ? (
            <div
              className="border-border flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap"
              data-testid="thread-owner-actions"
            >
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={detail.startEditing}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  {t('chat.threadEditDraft')}
                </Button>
              ) : null}
              {canApprove ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => publish.mutate()}
                  disabled={publish.isSuccess}
                  className="w-full sm:w-auto"
                  isLoading={publish.isPending}
                  data-tour="thread-review-approve"
                >
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                  {t('chat.threadApproveAndPublish')}
                </Button>
              ) : null}
              {canUnpublish ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:ms-auto sm:w-auto"
                  onClick={() => unpublish.mutate()}
                  disabled={unpublish.isPending}
                  isLoading={unpublish.isPending}
                >
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                  {t('chat.threadUnpublish')}
                </Button>
              ) : null}
            </div>
          ) : null}
          {selectedPublication && (draft || isPublished) ? (
            <ThreadExportPanel
              baseName={`thread-${detail.publicationId}`}
              options={THREAD_OWNER_EXPORT_OPTIONS}
              buildFile={detail.buildExportFile}
              showPdf={Boolean(draft)}
            />
          ) : null}
          {detail.publicUrl !== null ? (
            <ThreadShareMenu url={detail.publicUrl} title={selectedPublication?.title ?? ''} />
          ) : null}
          {unpublish.isError ? (
            <ThreadErrorNotice message={resolveThreadErrorMessage(unpublish.error)} />
          ) : null}
          {publish.isError ? (
            <ThreadErrorNotice message={resolveThreadErrorMessage(publish.error)} />
          ) : null}
          {isPublished ? (
            <ThreadChangeRequests
              publicationId={detail.publicationId}
              revisionSource={draft ?? null}
              onRevisionStarted={detail.startRevisionFromChangeRequest}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
