import { useState } from 'react';

import { AdminCurationTab } from '@/enums/admin-curation-tab.enum';
import { useTranslation } from '@/lib/i18n';
import type { UseAdminCurationPageReturn } from '@/types/plugin-admin-curation.types';

import { useAdminCurationAudit } from './use-admin-curation-audit';
import { useAdminCurationDialogs } from './use-admin-curation-dialogs';
import { useAdminCurationEntries } from './use-admin-curation-entries';
import { useAdminCurationQueue } from './use-admin-curation-queue';
import { useAdminCurationRules } from './use-admin-curation-rules';

/** /admin/plugins/curation (PLUGINS_ADMIN): the active tab and the four tabs' state. */
export function useAdminCurationPage(): UseAdminCurationPageReturn {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminCurationTab>(AdminCurationTab.Entries);
  return {
    t,
    tab,
    setTab,
    entries: useAdminCurationEntries(),
    queue: useAdminCurationQueue(),
    rules: useAdminCurationRules(),
    audit: useAdminCurationAudit(),
    dialogs: useAdminCurationDialogs(),
  };
}
