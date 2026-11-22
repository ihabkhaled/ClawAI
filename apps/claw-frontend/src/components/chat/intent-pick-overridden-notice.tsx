import { MessageSquareText } from 'lucide-react';
import type { ReactElement } from 'react';

import type { IntentPickOverriddenNoticeProps } from '@/types';

/**
 * "Answered in text — X only makes images, videos or files." Shown with an
 * answer a chat model wrote because the picked model cannot answer in text,
 * so the swap is never silent and the user knows how to get the media.
 */
export function IntentPickOverriddenNotice({
  info,
  t,
}: IntentPickOverriddenNoticeProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="intent-pick-overridden-notice"
      className="border-warning/40 bg-warning-surface text-warning flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs"
    >
      <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">
        {t('pickedModel.intentOverriddenNotice', { model: info.model })}
      </span>
    </div>
  );
}
