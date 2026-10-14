import { Alert } from '@/components/ui/alert';
import { ADMIN_CURATION_SERVER_FILTERS } from '@/constants/plugin-admin-curation.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AdminCurationQueueTabProps } from '@/types/plugin-admin-curation.types';

import { AdminCurationListState } from './admin-curation-list-state';
import { AdminCurationQueueRow } from './admin-curation-queue-row';
import { AdminCurationSelect } from './admin-curation-select';

/** The approval queue: a state filter and one row per user server. */
export function AdminCurationQueueTab({
  state,
  dialogs,
  t,
}: AdminCurationQueueTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <AdminCurationSelect
          id="curation-queue-filter"
          label={t('pluginsAdminCatalog.queue.filter')}
          value={state.filter}
          options={ADMIN_CURATION_SERVER_FILTERS.map((item) => ({
            value: item.value,
            label: t(item.labelKey),
          }))}
          onChange={(value) => {
            const next = ADMIN_CURATION_SERVER_FILTERS.find((item) => item.value === value);
            state.setFilter(next?.value ?? 'PENDING_APPROVAL');
          }}
        />
      </div>
      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}
      <AdminCurationListState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={state.servers.length === 0}
        emptyKey="pluginsAdminCatalog.queue.empty"
        retry={state.retry}
        t={t}
      >
        <ul className="grid grid-cols-1 gap-4">
          {state.servers.map((server) => (
            <li key={server.id} className="min-w-0">
              <AdminCurationQueueRow
                server={server}
                busy={state.pendingId === server.id}
                onApprove={state.approve}
                onReject={dialogs.askReject}
                t={t}
              />
            </li>
          ))}
        </ul>
      </AdminCurationListState>
    </div>
  );
}
