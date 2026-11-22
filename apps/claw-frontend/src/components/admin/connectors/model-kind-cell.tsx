'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import type { ModelExposureChipProps } from '@/types/model-exposure.types';

/**
 * What the model is FOR. A non-chat row says "Not offered in chat" and why, so
 * an Exposed / Active TOOL model can no longer read as a picker bug
 * (models/gemini-decision-1, 2026-11-22).
 */
export function ModelKindCell({ view, t }: ModelExposureChipProps): ReactElement {
  const { kindView } = view;
  return (
    <div className="flex min-w-0 flex-col items-start gap-1" data-testid="model-kind-cell">
      <StatusBadge status={t(kindView.labelKey)} className={kindView.badgeClass} />
      {kindView.offeredInChat ? null : (
        <p className="text-muted-foreground text-xs">
          <span className="font-medium">{t('adminConnectors.visibility.notInChat')}</span>
          <span className="block break-words">
            {kindView.reason === null ? (
              t('adminConnectors.visibility.notInChatGeneric')
            ) : (
              <bdi>{kindView.reason}</bdi>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
