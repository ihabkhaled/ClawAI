import { useCallback, useState } from 'react';

import type { AdminUser } from '@/types/audit.types';
import type { UseAssignPlanDialogStateReturn } from '@/types/hook.types';

// Composed FROM useUserTableState, never called directly from UserTable.tsx —
// see UseAssignPlanDialogStateReturn's doc comment for why this exists as a
// separate hook instead of living inline.
export function useAssignPlanDialogState(): UseAssignPlanDialogStateReturn {
  const [assignPlanUser, setAssignPlanUser] = useState<AdminUser | null>(null);
  const [assignPlanTargetId, setAssignPlanTargetId] = useState<string | null>(null);

  const openAssignPlan = useCallback((user: AdminUser, planId: string): void => {
    setAssignPlanUser(user);
    setAssignPlanTargetId(planId);
  }, []);

  const closeAssignPlan = useCallback((): void => {
    setAssignPlanUser(null);
    setAssignPlanTargetId(null);
  }, []);

  return { assignPlanUser, assignPlanTargetId, openAssignPlan, closeAssignPlan };
}
