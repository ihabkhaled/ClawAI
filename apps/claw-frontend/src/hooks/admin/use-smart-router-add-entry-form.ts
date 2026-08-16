import { useCallback, useMemo, useState } from 'react';

import { SMART_ROUTER_ENTRY_FORM_DEFAULTS } from '@/constants/smart-router-admin.constants';
import type {
  RouterChainEntryRole,
  RouterProvider,
  RouterConfigurationBillingModel,
} from '@/enums/router-configuration.enum';
import type {
  ChainEntryInput,
  UseSmartRouterAddEntryFormResult,
} from '@/types/smart-router-admin.types';

/** Local form state for the "add chain entry" form. Covers the fields an
 * operator needs day to day (provider, model, role, billing model,
 * deployment id, timeout, retries, triggers); `enabled` and
 * `skipWhenProviderCircuitOpen` default to the backend's own Zod defaults
 * and `minConfidence` / `maxCostMicroUsd` are left unset — advanced per-entry
 * tuning is available by editing the entry after it lands, not in this
 * quick-add form. */
export function useSmartRouterAddEntryForm(): UseSmartRouterAddEntryFormResult {
  const [provider, setProvider] = useState<RouterProvider>(
    SMART_ROUTER_ENTRY_FORM_DEFAULTS.provider,
  );
  const [modelAlias, setModelAlias] = useState('');
  const [role, setRole] = useState<RouterChainEntryRole>(SMART_ROUTER_ENTRY_FORM_DEFAULTS.role);
  const [billingModel, setBillingModel] = useState<RouterConfigurationBillingModel>(
    SMART_ROUTER_ENTRY_FORM_DEFAULTS.billingModel,
  );
  const [deploymentId, setDeploymentId] = useState('');
  const [attemptTimeoutMs, setAttemptTimeoutMs] = useState<number>(
    SMART_ROUTER_ENTRY_FORM_DEFAULTS.attemptTimeoutMs,
  );
  const [retries, setRetries] = useState<number>(SMART_ROUTER_ENTRY_FORM_DEFAULTS.retries);
  const [triggers, setTriggers] = useState('');

  const fieldErrors = useMemo(
    () => (modelAlias.trim().length === 0 ? { modelAlias: ['required'] } : {}),
    [modelAlias],
  );

  const buildInput = useCallback((): ChainEntryInput | null => {
    const trimmedAlias = modelAlias.trim();
    if (trimmedAlias.length === 0) {
      return null;
    }
    return {
      role,
      provider,
      modelAlias: trimmedAlias,
      deploymentId: deploymentId.trim().length > 0 ? deploymentId.trim() : undefined,
      enabled: SMART_ROUTER_ENTRY_FORM_DEFAULTS.enabled,
      attemptTimeoutMs,
      retries,
      triggers: triggers
        .split(',')
        .map((trigger) => trigger.trim())
        .filter((trigger) => trigger.length > 0),
      skipWhenProviderCircuitOpen: SMART_ROUTER_ENTRY_FORM_DEFAULTS.skipWhenProviderCircuitOpen,
      billingModel,
    };
  }, [attemptTimeoutMs, billingModel, deploymentId, modelAlias, provider, retries, role, triggers]);

  const reset = useCallback((): void => {
    setProvider(SMART_ROUTER_ENTRY_FORM_DEFAULTS.provider);
    setModelAlias('');
    setRole(SMART_ROUTER_ENTRY_FORM_DEFAULTS.role);
    setBillingModel(SMART_ROUTER_ENTRY_FORM_DEFAULTS.billingModel);
    setDeploymentId('');
    setAttemptTimeoutMs(SMART_ROUTER_ENTRY_FORM_DEFAULTS.attemptTimeoutMs);
    setRetries(SMART_ROUTER_ENTRY_FORM_DEFAULTS.retries);
    setTriggers('');
  }, []);

  return {
    provider,
    setProvider,
    modelAlias,
    setModelAlias,
    role,
    setRole,
    billingModel,
    setBillingModel,
    deploymentId,
    setDeploymentId,
    attemptTimeoutMs,
    setAttemptTimeoutMs,
    retries,
    setRetries,
    triggers,
    setTriggers,
    fieldErrors,
    buildInput,
    reset,
  };
}
