'use client';

import { Send, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThreadChangeAcceptMode } from '@/enums/thread-change-accept-mode.enum';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeRequestRevisionFormProps } from '@/types/thread-publication.types';

/** Apply with AI review: the revised article and its spend cap, sent through the capped automatic review. */
export function ThreadChangeRequestRevisionForm({
  requestId,
  controller,
  revisionSource,
}: ThreadChangeRequestRevisionFormProps): ReactElement {
  const { t } = useTranslation();
  const { resolve, form, cancelAcceptance } = controller;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        resolve.mutate({
          requestId,
          status: ThreadPublicationChangeRequestStatus.Accepted,
          ownerResponse: form.ownerResponses[requestId] ?? '',
          mode: ThreadChangeAcceptMode.AiReview,
        });
      }}
    >
      <p className="text-muted-foreground text-sm">{t('chat.threadChangeAcceptDisclosure')}</p>
      {!revisionSource ? <p role="alert">{t('chat.threadChangeAcceptUnavailable')}</p> : null}
      <div className="flex flex-col gap-2">
        <label htmlFor={`thread-change-revision-${requestId}`} className="text-sm font-medium">
          {t('chat.threadRevisionContent')}
        </label>
        <Textarea
          id={`thread-change-revision-${requestId}`}
          required
          maxLength={100000}
          value={form.revisionMarkdown}
          onChange={(event) => form.setRevisionMarkdown(event.target.value)}
          disabled={resolve.isPending || !revisionSource}
        />
      </div>
      {!form.revisionChanged ? (
        <p className="text-muted-foreground text-sm">{t('chat.threadChangeRevisionUnchanged')}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor={`thread-change-cap-${requestId}`} className="text-sm font-medium">
          {t('chat.threadRevisionCap')}
        </label>
        <Input
          id={`thread-change-cap-${requestId}`}
          type="number"
          min="0.01"
          step="0.01"
          required
          value={form.spendCapUsd}
          onChange={(event) => form.setSpendCapUsd(event.target.value)}
          disabled={resolve.isPending || !revisionSource}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          disabled={resolve.isPending || !revisionSource || !form.revisionChanged}
          isLoading={resolve.isPending}
          className="w-full sm:w-auto"
        >
          <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('chat.threadSubmitChangeDecision')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={cancelAcceptance}
          disabled={resolve.isPending}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
