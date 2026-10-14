import { Card, CardContent } from '@/components/ui/card';
import type {
  AdminCurationTabProps,
  UseAdminCurationAuditReturn,
} from '@/types/plugin-admin-curation.types';

import { AdminCurationListState } from './admin-curation-list-state';

/** The audit log: what changed, who changed it and when. Summaries hold names and counts only. */
export function AdminCurationAuditTab({
  state,
  t,
}: AdminCurationTabProps<UseAdminCurationAuditReturn>): React.ReactElement {
  return (
    <AdminCurationListState
      isLoading={state.isLoading}
      isError={state.isError}
      isEmpty={state.rows.length === 0}
      emptyKey="pluginsAdminCatalog.audit.empty"
      retry={state.retry}
      t={t}
    >
      <ul className="grid grid-cols-1 gap-3">
        {state.rows.map((row) => (
          <li key={row.id} className="min-w-0">
            <Card>
              <CardContent className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <code className="font-semibold" dir="ltr">
                    {row.action}
                  </code>
                  <code className="text-muted-foreground break-all" dir="ltr">
                    {row.targetType} · {row.targetId}
                  </code>
                </div>
                <p className="text-muted-foreground text-xs break-all">
                  {t('pluginsAdminCatalog.audit.by', { value: row.actorId })} ·{' '}
                  <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time>
                </p>
                <code className="text-muted-foreground block text-xs break-all" dir="ltr">
                  {JSON.stringify(row.summary)}
                </code>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </AdminCurationListState>
  );
}
