import type { ReactElement } from 'react';

import { ThreadChangeRequests } from '@/components/threads/thread-change-requests';
import { ThreadExportPanel } from '@/components/threads/thread-export-panel';
import { ThreadShareMenu } from '@/components/threads/thread-share-menu';
import { Button } from '@/components/ui/button';
import { THREAD_OWNER_EXPORT_OPTIONS } from '@/constants/thread-publication.constants';
import { ThreadRevisionField } from '@/enums/thread-revision-field.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadPublicationDetailController } from '@/types/thread-publication.types';
import { threadStageLabelKey } from '@/utilities/thread-generation-stage.utility';

/**
 * One publication, after generation starts: progress, draft preview, capped
 * edits, approve and publish, unpublish, export and reader suggestions. Pure
 * render; `useThreadPublicationDetail` owns every query and mutation.
 */
export function ThreadPublicationDetail({
  detail,
}: {
  detail: ThreadPublicationDetailController;
}): ReactElement | null {
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
  const stageLabelKey = generation.data ? threadStageLabelKey(generation.data.stage) : null;

  return (
    <>
      {generation.isFetching && !generation.data ? (
        <p role="status">{t('common.loading')}</p>
      ) : null}
      {generation.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
      {generation.data ? (
        <section
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-5"
          aria-live="polite"
        >
          {detail.hasDraft ? (
            <h2 className="text-lg font-semibold">{t('chat.threadDraftPreview')}</h2>
          ) : null}
          {detail.generationFailed && !detail.hasDraft ? (
            <p role="alert">{t('chat.threadCreateFailed')}</p>
          ) : null}
          {detail.generationCancelled && !detail.hasDraft ? (
            <p role="status">{t('chat.threadGenerationCancelled')}</p>
          ) : null}
          {cancel.isPending ? <p role="status">{t('chat.threadCancellationRequesting')}</p> : null}
          {cancel.isSuccess ? <p role="status">{t('chat.threadCancellationRequested')}</p> : null}
          {cancel.isError ? <p role="alert">{t('chat.threadCancellationFailed')}</p> : null}
          {!detail.generationFailed && !detail.generationCancelled && !detail.hasDraft ? (
            <p role="status" data-testid="thread-generation-stage">
              {stageLabelKey === null ? t('common.loading') : t(stageLabelKey)}
              {generation.data.round > 0
                ? ` · ${t('chat.threadStageRound', { round: String(generation.data.round) })}`
                : ''}
            </p>
          ) : null}
          {draft ? (
            <>
              <h3 className="font-medium">{t('chat.threadDraftPreview')}</h3>
              <pre className="bg-muted/30 max-h-[32rem] overflow-auto rounded-md p-4 text-sm whitespace-pre-wrap">
                {draft.markdown}
              </pre>
              <h3 className="font-medium">{t('chat.threadCitations')}</h3>
              <ul className="list-inside list-disc">
                {draft.citations.map(({ evidenceId, url }) => (
                  <li key={evidenceId}>
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
          {draft &&
          !editingRevision &&
          (!activeRevisionId || detail.revisionIsTerminal || revisionReview.isError) ? (
            <Button type="button" variant="outline" className="w-fit" onClick={detail.startEditing}>
              {t('chat.threadEditDraft')}
            </Button>
          ) : null}
          {editingRevision ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                editRevision.mutate();
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                {t('chat.threadRevisionContent')}
                <textarea
                  required
                  maxLength={100000}
                  value={detail.revisionMarkdown}
                  onChange={(event) =>
                    detail.changeRevisionField(ThreadRevisionField.Markdown, event.target.value)
                  }
                  className="border-input bg-background min-h-64 rounded-md border px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('chat.threadRevisionCap')}
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={detail.revisionCapUsd}
                  onChange={(event) =>
                    detail.changeRevisionField(ThreadRevisionField.Cap, event.target.value)
                  }
                  className="border-input bg-background rounded-md border px-3 py-2"
                />
              </label>
              <p className="text-muted-foreground text-sm">
                {t('chat.threadRevisionReviewDisclosure')}
              </p>
              {editRevision.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={editRevision.isPending}
                  isLoading={editRevision.isPending}
                >
                  {t('chat.threadSubmitRevision')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => detail.setEditingRevision(false)}
                >
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
          {revisionReview.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          draft &&
          !detail.publicationReady &&
          !publish.isSuccess ? (
            <p role="status">{t('chat.threadDraftNotEligible')}</p>
          ) : null}
          {generation.data.status !== 'WAITING_FOR_REVIEW' &&
          generation.data.status !== 'FAILED' &&
          generation.data.status !== 'CANCELLED' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending || cancel.isSuccess}
              className="w-fit"
              isLoading={cancel.isPending}
            >
              {t('common.cancel')}
            </Button>
          ) : null}
          {publish.isSuccess ? <p role="status">{t('chat.threadPublished')}</p> : null}
          {generation.data.status === 'WAITING_FOR_REVIEW' &&
          draft &&
          (activeRevisionId ? revisionReview.data?.ready : detail.publicationReady) &&
          !publish.isSuccess ? (
            <Button
              type="button"
              onClick={() => publish.mutate()}
              disabled={publish.isSuccess}
              className="w-fit"
              isLoading={publish.isPending}
            >
              {t('chat.threadApproveAndPublish')}
            </Button>
          ) : null}
          {selectedPublication?.status === 'PUBLISHED' && !unpublish.isSuccess ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => unpublish.mutate()}
              disabled={unpublish.isPending}
              isLoading={unpublish.isPending}
            >
              {t('chat.threadUnpublish')}
            </Button>
          ) : null}
          {selectedPublication && (draft || selectedPublication.status === 'PUBLISHED') ? (
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
          {unpublish.isError ? <p role="alert">{t('chat.threadCreateFailed')}</p> : null}
          {publish.isError || cancel.isError ? (
            <p role="alert">{t('chat.threadCreateFailed')}</p>
          ) : null}
          {selectedPublication?.status === 'PUBLISHED' ? (
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
