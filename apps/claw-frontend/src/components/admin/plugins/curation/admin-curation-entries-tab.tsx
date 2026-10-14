import { Plus } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AdminCurationEntriesTabProps } from '@/types/plugin-admin-curation.types';

import { AdminCurationEntryRow } from './admin-curation-entry-row';
import { AdminCurationListState } from './admin-curation-list-state';

/** The curated entries: a New entry button and one row per entry. */
export function AdminCurationEntriesTab({
  state,
  dialogs,
  t,
}: AdminCurationEntriesTabProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={dialogs.openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('pluginsAdminCatalog.entries.new')}
        </Button>
      </div>
      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}
      <AdminCurationListState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={state.entries.length === 0}
        emptyKey="pluginsAdminCatalog.entries.empty"
        retry={state.retry}
        t={t}
      >
        <ul className="grid grid-cols-1 gap-4">
          {state.entries.map((entry) => (
            <li key={entry.slug} className="min-w-0">
              <AdminCurationEntryRow
                entry={entry}
                busy={state.pendingSlug === entry.slug}
                onEnabled={state.setEnabled}
                onHealth={state.checkHealth}
                onEdit={dialogs.openEdit}
                onDelete={dialogs.askDelete}
                t={t}
              />
            </li>
          ))}
        </ul>
      </AdminCurationListState>
    </div>
  );
}
