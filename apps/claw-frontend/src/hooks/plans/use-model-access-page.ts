import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ROUTES } from '@/constants/routes.constants';
import { PlanModelAccessMode, UserRole } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useTranslation } from '@/lib/i18n';
import { plansRepository } from '@/repositories/admin/plans.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  ModelAccessRowState,
  PlanModelAccessInput,
  PlanModelAccessView,
  TranslateFunction,
  UpdatePlanModelAccessRequest,
  UseModelAccessPageResult,
  UserProfile,
} from '@/types';
import { logger, showToast } from '@/utilities';
import { invalidateUserPlanQueries } from '@/utilities/plan-cache.utility';

const toRow = (model: PlanModelAccessView): ModelAccessRowState => ({
  rowKey: crypto.randomUUID(),
  provider: model.provider,
  model: model.model,
  isAllowed: model.isAllowed,
  allowAsPrimary: model.allowAsPrimary,
  allowAsFallback: model.allowAsFallback,
  allowAsJudge: model.allowAsJudge,
  allowInCompare: model.allowInCompare,
  dailyTokenLimitOverride:
    model.dailyTokenLimitOverride === null ? '' : String(model.dailyTokenLimitOverride),
});

const emptyRow = (): ModelAccessRowState => ({
  rowKey: crypto.randomUUID(),
  provider: '',
  model: '',
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback: true,
  allowAsJudge: false,
  allowInCompare: true,
  dailyTokenLimitOverride: '',
});

const toDefaultRow = (provider: string, model: string): ModelAccessRowState => ({
  rowKey: crypto.randomUUID(),
  provider,
  model,
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback: true,
  allowAsJudge: true,
  allowInCompare: true,
  dailyTokenLimitOverride: '',
});

const toInput = (row: ModelAccessRowState): PlanModelAccessInput => {
  const trimmed = row.dailyTokenLimitOverride.trim();
  const parsed = trimmed.length === 0 ? null : Number.parseInt(trimmed, 10);
  return {
    provider: row.provider.trim(),
    model: row.model.trim(),
    isAllowed: row.isAllowed,
    allowAsPrimary: row.allowAsPrimary,
    allowAsFallback: row.allowAsFallback,
    allowAsJudge: row.allowAsJudge,
    allowInCompare: row.allowInCompare,
    dailyTokenLimitOverride: parsed !== null && Number.isNaN(parsed) ? null : parsed,
  };
};

export function useModelAccessPage(): UseModelAccessPageResult & {
  t: TranslateFunction;
  user: UserProfile | null;
} {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const planId = params.id ?? '';
  const isAdmin = user?.role === UserRole.ADMIN;
  const { groupedModels, isLoading: isCatalogLoading } = useAvailableModels();

  const [rows, setRows] = useState<ModelAccessRowState[]>([]);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const query = useQuery({
    queryKey: queryKeys.adminPlans.detail(planId),
    queryFn: () => plansRepository.get(planId),
    enabled: isAdmin && planId.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      if (
        query.data.modelAccessMode === PlanModelAccessMode.ALLOW_LIST ||
        query.data.modelAccessMode === PlanModelAccessMode.DENY_ALL
      ) {
        setRows(query.data.modelAccess.map(toRow));
        return;
      }
      setRows(
        groupedModels.flatMap((group) =>
          group.models.map((model) => toDefaultRow(model.provider, model.model)),
        ),
      );
    }
  }, [groupedModels, query.data]);

  const addRow = useCallback((): void => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const removeRow = useCallback((rowKey: string): void => {
    setRows((prev) => prev.filter((row) => row.rowKey !== rowKey));
  }, []);

  const updateRow = useCallback(
    <K extends keyof ModelAccessRowState>(
      rowKey: string,
      field: K,
      value: ModelAccessRowState[K],
    ): void => {
      setRows((prev) =>
        prev.map((row) => (row.rowKey === rowKey ? { ...row, [field]: value } : row)),
      );
    },
    [],
  );

  const goBack = useCallback((): void => {
    router.push(ROUTES.ADMIN_PLANS);
  }, [router]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdatePlanModelAccessRequest) =>
      plansRepository.updateModelAccess(planId, payload),
    onMutate: () => setSaveError(null),
    onSuccess: () => {
      showToast.success({ description: t('adminPlans.modelAccess.saveSucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.detail(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminPlans.lists() });
      void invalidateUserPlanQueries(queryClient);
      goBack();
    },
    onError: (err: Error) => {
      setSaveError(err);
      showToast.apiError(err, t('adminPlans.modelAccess.saveFailed'));
    },
  });

  const onSave = useCallback((): void => {
    logger.info({
      component: 'admin-plans',
      action: 'save-model-access',
      message: 'Saving model access',
      details: { planId, count: rows.length },
    });
    saveMutation.mutate({ models: rows.map(toInput) });
  }, [rows, saveMutation, planId]);

  const onCancel = useCallback((): void => goBack(), [goBack]);
  const onRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    t,
    user: user ?? null,
    plan: query.data ?? null,
    rows,
    isLoading: query.isLoading || isCatalogLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    isSaving: saveMutation.isPending,
    saveError,
    addRow,
    removeRow,
    updateRow,
    onSave,
    onCancel,
    onRetry,
  };
}
