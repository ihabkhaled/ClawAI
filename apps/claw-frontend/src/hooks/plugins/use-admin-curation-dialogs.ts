import type { AdminServerView, CuratedEntryView } from '@claw/shared-types';
import { useState } from 'react';

import type { UseAdminCurationDialogsReturn } from '@/types/plugin-admin-curation.types';

/** Which dialog is open on the curation page: the entry form, the delete confirmation or the reject reason. */
export function useAdminCurationDialogs(): UseAdminCurationDialogsReturn {
  const [entryOpen, setEntryOpen] = useState(false);
  const [entry, setEntry] = useState<CuratedEntryView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CuratedEntryView | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminServerView | null>(null);
  const [reason, setReason] = useState('');
  return {
    entryOpen,
    entry,
    openCreate: () => {
      setEntry(null);
      setEntryOpen(true);
    },
    openEdit: (target) => {
      setEntry(target);
      setEntryOpen(true);
    },
    closeEntry: () => {
      setEntryOpen(false);
    },
    deleteTarget,
    askDelete: setDeleteTarget,
    closeDelete: () => {
      setDeleteTarget(null);
    },
    rejectTarget,
    reason,
    setReason,
    askReject: (server) => {
      setReason('');
      setRejectTarget(server);
    },
    closeReject: () => {
      setRejectTarget(null);
    },
  };
}
