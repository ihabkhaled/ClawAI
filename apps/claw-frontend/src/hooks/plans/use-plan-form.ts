import { useCallback, useEffect, useState } from 'react';

import { PLAN_FORM_DEFAULTS, PLAN_TRIAL_DURATION_DAYS } from '@/constants/plan.constants';
import { createPlanSchema, updatePlanSchema } from '@/lib/validation/plan.schema';
import type {
  CreatePlanRequest,
  PlanFormFieldErrors,
  PlanFormState,
  PlanView,
  UpdatePlanRequest,
  UsePlanFormResult,
} from '@/types';

const numToStr = (value: number | null): string => (value === null ? '' : String(value));

const fromPlan = (plan: PlanView): PlanFormState => ({
  name: plan.name,
  slug: plan.slug,
  description: plan.description ?? '',
  displayOrder: String(plan.displayOrder),
  isPublic: plan.isPublic,
  isTrial: plan.isTrial,
  dailyTokenQuota: String(plan.dailyTokenQuota),
  monthlyTokenQuota: numToStr(plan.monthlyTokenQuota),
  maxChatsPerDay: numToStr(plan.maxChatsPerDay),
  maxMessagesPerDay: numToStr(plan.maxMessagesPerDay),
  maxWorkspaceConnections: numToStr(plan.maxWorkspaceConnections),
  maxContextPacks: numToStr(plan.maxContextPacks),
  maxMemoryItems: numToStr(plan.maxMemoryItems),
  allowCompareMode: plan.allowCompareMode,
  allowJudgeMode: plan.allowJudgeMode,
  allowResearchMode: plan.allowResearchMode,
  allowCriticReview: plan.allowCriticReview,
  allowWorkspaces: plan.allowWorkspaces,
  allowMemory: plan.allowMemory,
  allowContextPacks: plan.allowContextPacks,
  allowConsensusMode: plan.allowConsensusMode,
  allowEscalationChain: plan.allowEscalationChain,
  allowRepairLab: plan.allowRepairLab,
  allowTaskDecomposer: plan.allowTaskDecomposer,
  allowBestOfN: plan.allowBestOfN,
  allowVerifier: plan.allowVerifier,
  allowPipelineLab: plan.allowPipelineLab,
  allowCostEnsemble: plan.allowCostEnsemble,
  allowRolePack: plan.allowRolePack,
});

const buildPayload = (state: PlanFormState): Record<string, unknown> => ({
  name: state.name,
  slug: state.slug,
  description: state.description.length === 0 ? undefined : state.description,
  displayOrder: state.displayOrder,
  isPublic: state.isPublic,
  isTrial: state.isTrial,
  trialDurationDays: state.isTrial ? PLAN_TRIAL_DURATION_DAYS : null,
  dailyTokenQuota: state.dailyTokenQuota,
  monthlyTokenQuota: state.monthlyTokenQuota,
  maxChatsPerDay: state.maxChatsPerDay,
  maxMessagesPerDay: state.maxMessagesPerDay,
  maxWorkspaceConnections: state.maxWorkspaceConnections,
  maxContextPacks: state.maxContextPacks,
  maxMemoryItems: state.maxMemoryItems,
  allowCompareMode: state.allowCompareMode,
  allowJudgeMode: state.allowJudgeMode,
  allowResearchMode: state.allowResearchMode,
  allowCriticReview: state.allowCriticReview,
  allowWorkspaces: state.allowWorkspaces,
  allowMemory: state.allowMemory,
  allowContextPacks: state.allowContextPacks,
  allowConsensusMode: state.allowConsensusMode,
  allowEscalationChain: state.allowEscalationChain,
  allowRepairLab: state.allowRepairLab,
  allowTaskDecomposer: state.allowTaskDecomposer,
  allowBestOfN: state.allowBestOfN,
  allowVerifier: state.allowVerifier,
  allowPipelineLab: state.allowPipelineLab,
  allowCostEnsemble: state.allowCostEnsemble,
  allowRolePack: state.allowRolePack,
});

export function usePlanForm(initial: PlanView | null): UsePlanFormResult {
  const [state, setState] = useState<PlanFormState>(() =>
    initial ? fromPlan(initial) : PLAN_FORM_DEFAULTS,
  );
  const [fieldErrors, setFieldErrors] = useState<PlanFormFieldErrors>({});

  useEffect(() => {
    setState(initial ? fromPlan(initial) : PLAN_FORM_DEFAULTS);
    setFieldErrors({});
  }, [initial]);

  const setField = useCallback(
    <K extends keyof PlanFormState>(field: K, value: PlanFormState[K]): void => {
      setState((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (prev[field] === undefined) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const collectErrors = useCallback((issues: { path: PropertyKey[]; message: string }[]): void => {
    const errors: PlanFormFieldErrors = {};
    for (const issue of issues) {
      const key = issue.path[0] as keyof PlanFormState;
      if (errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
    setFieldErrors(errors);
  }, []);

  const buildCreateRequest = useCallback((): CreatePlanRequest | null => {
    const result = createPlanSchema.safeParse(buildPayload(state));
    if (result.success) {
      return result.data as CreatePlanRequest;
    }
    collectErrors(result.error.issues);
    return null;
  }, [state, collectErrors]);

  const buildUpdateRequest = useCallback((): UpdatePlanRequest | null => {
    const result = updatePlanSchema.safeParse(buildPayload(state));
    if (result.success) {
      return result.data as UpdatePlanRequest;
    }
    collectErrors(result.error.issues);
    return null;
  }, [state, collectErrors]);

  return { state, setField, fieldErrors, buildCreateRequest, buildUpdateRequest };
}
