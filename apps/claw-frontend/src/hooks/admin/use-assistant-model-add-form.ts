import { useCallback, useMemo, useState } from 'react';

import {
  ASSISTANT_MODEL_FORM_DEFAULTS,
  SMART_ROUTER_ENTRY_FORM_DEFAULTS,
} from '@/constants/smart-router-admin.constants';
import type { RouterProvider } from '@/enums/router-configuration.enum';
import type {
  AssistantModelInput,
  UseAssistantModelAddFormResult,
} from '@/types/smart-router-admin.types';

import { useSmartRouterSelectableDeployments } from './use-smart-router-selectable-deployments';

/** Local form state for adding one assistant-model candidate. Same picker
 * discipline as the chain form: the model is chosen from the real catalog, so
 * a name that does not exist cannot be configured. */
export function useAssistantModelAddForm(): UseAssistantModelAddFormResult {
  const [provider, setProvider] = useState<RouterProvider>(
    SMART_ROUTER_ENTRY_FORM_DEFAULTS.provider,
  );
  const [modelAlias, setModelAlias] = useState('');
  const [deploymentId, setDeploymentId] = useState('');
  const { deployments } = useSmartRouterSelectableDeployments();

  const modelOptions = useMemo(
    () => deployments.filter((deployment) => deployment.provider === provider),
    [deployments, provider],
  );

  const selectProvider = useCallback((next: RouterProvider): void => {
    setProvider(next);
    setModelAlias('');
    setDeploymentId('');
  }, []);

  const selectModel = useCallback(
    (next: string): void => {
      setModelAlias(next);
      const match = modelOptions.find((option) => option.providerModelId === next);
      setDeploymentId(match?.id ?? '');
    },
    [modelOptions],
  );

  const buildInput = useCallback((): AssistantModelInput | null => {
    if (modelAlias.length === 0) {
      return null;
    }
    return {
      provider,
      modelAlias,
      deploymentId: deploymentId.length > 0 ? deploymentId : undefined,
      enabled: true,
      timeoutMs: ASSISTANT_MODEL_FORM_DEFAULTS.timeoutMs,
      maxTokens: ASSISTANT_MODEL_FORM_DEFAULTS.maxTokens,
    };
  }, [deploymentId, modelAlias, provider]);

  const reset = useCallback((): void => {
    setProvider(SMART_ROUTER_ENTRY_FORM_DEFAULTS.provider);
    setModelAlias('');
    setDeploymentId('');
  }, []);

  return {
    provider,
    setProvider: selectProvider,
    modelAlias,
    setModelAlias: selectModel,
    modelOptions,
    buildInput,
    reset,
  };
}
