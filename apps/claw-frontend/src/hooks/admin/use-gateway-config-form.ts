import { useCallback, useState } from 'react';

import { EMPTY_GATEWAY_CREDENTIALS } from '@/constants/gateway-config.constants';
import type { GatewayAdminView, GatewayConfigUpdate } from '@/types/billing.types';
import type { UseGatewayConfigFormResult } from '@/types/gateway-config.types';

export function useGatewayConfigForm(
  gateway: GatewayAdminView,
  onSave: (gateway: GatewayAdminView['gateway'], input: GatewayConfigUpdate) => void,
): UseGatewayConfigFormResult {
  const [isEnabled, setEnabled] = useState(gateway.isEnabled);
  const [mode, setMode] = useState(gateway.mode);
  const [credentials, setCredentials] = useState<Record<string, string>>(EMPTY_GATEWAY_CREDENTIALS);
  const [currency, setCurrency] = useState(gateway.options.currency ?? '');
  const [webhookUrl, setWebhookUrl] = useState(gateway.options.webhookUrl ?? '');
  const setCredential = useCallback((key: string, value: string): void => {
    setCredentials((current) => ({ ...current, [key]: value }));
  }, []);
  const submit = useCallback((): void => {
    onSave(gateway.gateway, {
      isEnabled,
      mode,
      credentials,
      options: { currency, webhookUrl },
    });
  }, [credentials, currency, gateway.gateway, isEnabled, mode, onSave, webhookUrl]);
  return {
    state: { isEnabled, mode, credentials, currency, webhookUrl },
    setEnabled,
    setMode,
    setCredential,
    setCurrency,
    setWebhookUrl,
    submit,
  };
}
