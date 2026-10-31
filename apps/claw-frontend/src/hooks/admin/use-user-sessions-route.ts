import { useParams } from 'next/navigation';

import { useUserSessionsPage } from '@/hooks/admin/use-user-sessions-page';
import type { UseUserSessionsPageReturn } from '@/types/admin-sessions.types';

/** Reads the [id] segment of /admin/users/[id]/sessions and drives the page. */
export function useUserSessionsRoute(): UseUserSessionsPageReturn {
  const params = useParams<{ id: string }>();
  return useUserSessionsPage(typeof params.id === 'string' ? params.id : '');
}
