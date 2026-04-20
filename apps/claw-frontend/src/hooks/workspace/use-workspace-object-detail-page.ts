import { useParams, useRouter } from 'next/navigation';

import { useTranslation } from '@/lib/i18n';
import type { UseWorkspaceObjectDetailPageReturn } from '@/types/hook.types';

import { useWorkspaceObjectDetail } from './use-workspace-object-detail';

export function useWorkspaceObjectDetailPage(): UseWorkspaceObjectDetailPageReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ objectId: string }>();
  const objectId = params?.objectId ?? '';
  const detail = useWorkspaceObjectDetail(objectId);

  return {
    t,
    objectId,
    object: detail.object,
    isLoading: detail.isLoading,
    isError: detail.isError,
    isRefreshing: detail.isRefreshing,
    refreshError: detail.refreshError,
    onRefresh: detail.refresh,
    onBack: () => router.push('/workspace'),
  };
}
