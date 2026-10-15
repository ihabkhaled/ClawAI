'use client';

import { Pencil, Sparkles, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { ThreadChangeAcceptMode } from '@/enums/thread-change-accept-mode.enum';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadChangeRequestChoiceProps } from '@/types/thread-publication.types';

/** After Accept: apply it with the AI review, or accept it and edit the article by hand. */
export function ThreadChangeRequestChoice({
  requestId,
  controller,
  revisionSource,
}: ThreadChangeRequestChoiceProps): ReactElement {
  const { t } = useTranslation();
  const { resolve, form, beginAcceptance, cancelAcceptance } = controller;

  return (
    <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">{t('chat.threadCrAcceptTitle')}</p>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          onClick={() => beginAcceptance(requestId)}
          disabled={!revisionSource || resolve.isPending}
          className="w-full sm:w-auto sm:self-start"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadCrApplyWithAi')}
        </Button>
        <p className="text-muted-foreground text-xs">{t('chat.threadCrApplyWithAiHint')}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            resolve.mutate({
              requestId,
              status: ThreadPublicationChangeRequestStatus.Accepted,
              ownerResponse: form.ownerResponses[requestId] ?? '',
              mode: ThreadChangeAcceptMode.EditMyself,
            })
          }
          disabled={resolve.isPending}
          isLoading={resolve.isPending}
          className="w-full sm:w-auto sm:self-start"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadCrEditMyself')}
        </Button>
        <p className="text-muted-foreground text-xs">{t('chat.threadCrEditMyselfHint')}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={cancelAcceptance}
        disabled={resolve.isPending}
        className="w-full sm:w-auto sm:self-start"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        {t('common.cancel')}
      </Button>
    </div>
  );
}
