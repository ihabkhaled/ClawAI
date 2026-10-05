import type { ReactElement } from 'react';

import type { UsageWorkflowsListProps } from '@/types/admin-usage-analytics.types';

/** Request counts per product surface. Workflow codes are identifiers, shown as stored. */
export function UsageWorkflowsList({
  workflows,
  heading,
}: UsageWorkflowsListProps): ReactElement | null {
  if (workflows.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{heading}</h4>
      <ul className="space-y-1 text-sm">
        {workflows.map((line) => (
          <li key={line.workflow} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{line.workflow}</span>
            <span className="font-medium tabular-nums">{line.requests.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
