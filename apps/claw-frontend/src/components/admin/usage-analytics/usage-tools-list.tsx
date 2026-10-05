import type { ReactElement } from 'react';

import type { UsageToolsListProps } from '@/types/admin-usage-analytics.types';
import { toolLabelKey } from '@/utilities/usage-analytics.utility';

/**
 * Gated tools delivered in the period (web search, fetch, file generation...),
 * most used first. A tool with no translated label shows its raw code rather
 * than a key string. `toolCallCount` is the in-answer tool-call total, which the
 * ledger stores as a count only, so it is shown beside the named list, not in it.
 */
export function UsageToolsList({
  tools,
  toolCallCount,
  heading,
  t,
}: UsageToolsListProps): ReactElement {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{heading}</h4>
      {tools.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('usageAnalytics.toolsEmpty')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {tools.map((line) => {
            const key = toolLabelKey(line.tool);
            return (
              <li key={line.tool} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{key === null ? line.tool : t(key)}</span>
                <span className="font-medium tabular-nums">{line.count.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      )}
      {toolCallCount === undefined ? null : (
        <p className="text-muted-foreground text-xs">
          {t('usageAnalytics.toolCallsTotal', { count: toolCallCount.toLocaleString() })}
        </p>
      )}
    </div>
  );
}
