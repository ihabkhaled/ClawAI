import { Shuffle } from 'lucide-react';
import type { ReactElement } from 'react';

import type { PickedModelFallbackNoticeProps } from '@/types';

/**
 * "Claude Opus failed, so X answered instead." Shown above an answer a
 * substitute wrote for the model the user picked. When the substitute is in a
 * higher cost class the notice says so: a pricier model never answers silently.
 */
export function PickedModelFallbackNotice({
  info,
  answeredModel,
  t,
}: PickedModelFallbackNoticeProps): ReactElement {
  const params = { original: info.originalModel, answered: answeredModel };
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="picked-model-fallback-notice"
      className="border-warning/40 bg-warning-surface text-warning flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs"
    >
      <Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5 break-words">
        <span className="font-semibold">{t('pickedModel.fallbackNotice', params)}</span>
        {info.costlier ? (
          <span className="text-warning/90">{t('pickedModel.costlierNote', params)}</span>
        ) : null}
      </div>
    </div>
  );
}
