import type { BillingGateway } from '@/enums/billing.enum';
import type { TranslateFunction } from '@/types/i18n.types';

import type { GatewayAdminView, GatewayConfigUpdate } from './billing.types';

export type GatewayConfigFormState = {
  isEnabled: boolean;
  mode: string;
  credentials: Record<string, string>;
  currency: string;
  webhookUrl: string;
};
export type GatewayConfigCardProps = {
  gateway: GatewayAdminView;
  isSaving: boolean;
  onSave: (gateway: BillingGateway, input: GatewayConfigUpdate) => void;
  t: TranslateFunction;
};
export type UseGatewayConfigFormResult = {
  state: GatewayConfigFormState;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: string) => void;
  setCredential: (key: string, value: string) => void;
  setCurrency: (value: string) => void;
  setWebhookUrl: (value: string) => void;
  submit: () => void;
};
export type UseAdminGatewayConfigResult = {
  gateways: GatewayAdminView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  savingGateway: BillingGateway | null;
  save: (gateway: BillingGateway, input: GatewayConfigUpdate) => void;
  retry: () => void;
  t: TranslateFunction;
};
