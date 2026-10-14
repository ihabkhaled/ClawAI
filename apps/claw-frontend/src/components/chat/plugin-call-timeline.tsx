'use client';

import { Plug } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  PLUGIN_CALL_FAILED_STATUSES,
  PLUGIN_CALL_STATUS_KEYS,
  PLUGIN_NOTICE_KEYS,
} from '@/constants/plugin-call.constants';
import { useTranslation } from '@/lib/i18n';
import type { PluginCallTimelineProps } from '@/types/plugin-call.types';
import { statusIconFor } from '@/utilities/plugin-call.utility';

/**
 * The plugins an answer used, above it: one row per tool call with its outcome and how long it
 * took, and the plugin's returned text behind a disclosure. What a plugin returned is untrusted
 * third-party text, so it is only ever shown as plain text (never HTML, never auto-linked).
 * Notices below explain a mentioned plugin that did not run. Renders nothing for an ordinary answer.
 */
export function PluginCallTimeline({
  calls,
  notices,
}: PluginCallTimelineProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (calls.length === 0 && notices.length === 0) {
    return null;
  }
  return (
    <section
      aria-label={t('pluginChat.calls.title')}
      data-testid="plugin-call-timeline"
      className="flex w-full min-w-0 flex-col gap-1 text-xs"
    >
      {calls.length > 0 ? (
        <>
          <h4 className="text-muted-foreground flex items-center gap-1 font-medium">
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pluginChat.calls.title')}
          </h4>
          <ol className="flex flex-col gap-1">
            {calls.map((call) => {
              const failed = PLUGIN_CALL_FAILED_STATUSES.has(call.status);
              const StatusIcon = statusIconFor(call.status, failed);
              return (
                <li
                  key={call.callId}
                  className="bg-muted/50 flex min-w-0 flex-col gap-1 rounded-md border px-2 py-1.5"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate font-medium">{call.title}</span>
                    <span className="text-muted-foreground" dir="ltr">
                      {call.pluginSlug}
                    </span>
                    <Badge variant={failed ? 'warning' : 'outline'} className="text-[10px]">
                      {t(PLUGIN_CALL_STATUS_KEYS[call.status])}
                    </Badge>
                    {call.durationMs > 0 ? (
                      <span className="text-muted-foreground">
                        {t('pluginChat.calls.duration', { value: String(call.durationMs) })}
                      </span>
                    ) : null}
                    {call.truncated ? (
                      <span className="text-muted-foreground">
                        {t('pluginChat.calls.truncated')}
                      </span>
                    ) : null}
                  </div>
                  {call.resultExcerpt === undefined ? null : (
                    <details>
                      <summary className="text-muted-foreground cursor-pointer">
                        {t('pluginChat.calls.resultToggle')}
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto font-sans break-words whitespace-pre-wrap">
                        {call.resultExcerpt}
                      </pre>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
      {notices.map((notice) => (
        <p
          key={notice.code}
          role="status"
          className="border-warning/40 bg-warning-surface text-warning rounded-md border px-2 py-1.5"
        >
          {t(PLUGIN_NOTICE_KEYS[notice.code])}
        </p>
      ))}
    </section>
  );
}
