'use client';

import type { ReactElement } from 'react';

import { ConnectorModelEventType } from '@/enums/model-visibility.enum';
import type { ModelVisibilityHistoryProps } from '@/types/model-visibility.types';
import { formatModelLastSeen } from '@/utilities/model-exposure.utility';

/** What syncs changed on this model (kind flips, unexposes), newest first. */
export function ModelVisibilityHistory({
  events,
  locale,
  t,
}: ModelVisibilityHistoryProps): ReactElement {
  return (
    <section className="flex flex-col gap-2" data-testid="model-visibility-history">
      <h3 className="text-sm font-medium">{t('adminConnectors.visibility.historyTitle')}</h3>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {t('adminConnectors.visibility.historyEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {events.map((event) => (
            <li key={`${event.type}-${event.createdAt}`} className="text-xs">
              <span className="font-medium">
                {event.type === ConnectorModelEventType.KIND_CHANGED
                  ? t('adminConnectors.visibility.eventKindChanged', {
                      before: event.beforeKind ?? '?',
                      after: event.afterKind ?? '?',
                    })
                  : t('adminConnectors.visibility.eventUnexposed')}
              </span>{' '}
              <span className="text-muted-foreground">
                <bdi>{formatModelLastSeen(event.createdAt, locale) ?? event.createdAt}</bdi>
              </span>
              {event.reason === null ? null : (
                <span className="text-muted-foreground block break-words">
                  <bdi>{event.reason}</bdi>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
