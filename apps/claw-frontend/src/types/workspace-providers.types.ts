import type { OAuthCallbackPhase } from '../enums/oauth-callback-phase.enum';
import type { WorkspaceProviderAppConfigStatus } from '../enums/workspace-provider-app-config-status.enum';
import type { WorkspaceProviderAuthMode } from '../enums/workspace-provider-auth-mode.enum';
import type { WorkspaceProviderDefinitionStatus } from '../enums/workspace-provider-definition-status.enum';
import type { WorkspaceProviderFieldType } from '../enums/workspace-provider-field-type.enum';

import type { PaginationMeta } from './audit.types';
import type { TranslateFunction } from './i18n.types';
import type { WorkspaceHealthCheckResult } from './workspace.types';

export type ProviderConfigField = {
  key: string;
  label: string;
  type: WorkspaceProviderFieldType;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  pattern?: string;
  min?: number;
  max?: number;
  appliesToAuthModes?: WorkspaceProviderAuthMode[];
};

export type ProviderConfigSchema = {
  version: number;
  fields: ProviderConfigField[];
};

export type WorkspaceProviderDefinition = {
  id: string;
  provider: string;
  displayName: string;
  description: string | null;
  authModes: WorkspaceProviderAuthMode[];
  defaultAuthMode: WorkspaceProviderAuthMode;
  configSchema: ProviderConfigSchema;
  capabilities: Record<string, boolean>;
  supportedObjects: string[];
  supportedActions: string[];
  iconUrl: string | null;
  docsUrl: string | null;
  adapterKey: string;
  status: WorkspaceProviderDefinitionStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceProviderAppConfig = {
  id: string;
  provider: string;
  definitionId: string;
  name: string;
  description: string | null;
  authMode: WorkspaceProviderAuthMode;
  publicConfig: Record<string, unknown>;
  scopes: string[];
  status: WorkspaceProviderAppConfigStatus;
  lastValidatedAt: string | null;
  validationError: string | null;
  secretVersion: number;
  hasSecret: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProviderAppConfigRequest = {
  provider: string;
  name: string;
  description?: string;
  authMode: WorkspaceProviderAuthMode;
  publicConfig: Record<string, unknown>;
  secretConfig?: Record<string, unknown>;
  scopes?: string[];
};

export type UpdateProviderAppConfigRequest = Partial<CreateProviderAppConfigRequest> & {
  status?: WorkspaceProviderAppConfigStatus;
};

export type ProviderCatalogResponse = WorkspaceProviderDefinition[];
export type ProviderAppConfigListResponse = WorkspaceProviderAppConfig[];

export type UseProviderCatalogReturn = {
  providers: WorkspaceProviderDefinition[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseProviderAppConfigsReturn = {
  configs: WorkspaceProviderAppConfig[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export type ProviderAppConfigFormValues = {
  provider: string;
  name: string;
  description: string;
  authMode: WorkspaceProviderAuthMode;
  publicConfig: Record<string, string>;
  secretConfig: Record<string, string>;
};

export type ProviderAppConfigFormErrors = Partial<Record<string, string>>;

export type WorkspacePaginationMeta = PaginationMeta;

export type ProviderCardProps = {
  provider: WorkspaceProviderDefinition;
  implementedAdapters: ReadonlySet<string>;
  t: TranslateFunction;
};

export type AppConfigRowProps = {
  config: WorkspaceProviderAppConfig;
  onTest: (id: string, provider: string) => void;
  onDelete: (id: string) => void;
  onConnect: (id: string, provider: string) => Promise<void>;
  isTestPending: boolean;
  isDeletePending: boolean;
  isConnectPending: boolean;
  t: TranslateFunction;
};

export type DynamicConfigFormProps = {
  schema: ProviderConfigSchema;
  authMode: WorkspaceProviderAuthMode;
  publicValues: Record<string, string>;
  secretValues: Record<string, string>;
  onPublicChange: (key: string, value: string) => void;
  onSecretChange: (key: string, value: string) => void;
  fieldErrors: Partial<Record<string, string>>;
  t: TranslateFunction;
};

export type AppConfigCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: WorkspaceProviderDefinition[];
  selectedProvider: WorkspaceProviderDefinition | null;
  form: ProviderAppConfigFormValues;
  fieldErrors: Partial<Record<string, string>>;
  onSetFormProvider: (provider: string) => void;
  onSetFormAuthMode: (mode: WorkspaceProviderAuthMode) => void;
  onSetField: <K extends keyof ProviderAppConfigFormValues>(
    key: K,
    value: ProviderAppConfigFormValues[K],
  ) => void;
  onSetPublicField: (key: string, value: string) => void;
  onSetSecretField: (key: string, value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type UseCreateProviderAppConfigReturn = {
  mutateAsync: (data: CreateProviderAppConfigRequest) => Promise<WorkspaceProviderAppConfig>;
  isPending: boolean;
  error: Error | null;
};

export type UseUpdateProviderAppConfigReturn = {
  mutateAsync: (input: {
    id: string;
    data: UpdateProviderAppConfigRequest;
  }) => Promise<WorkspaceProviderAppConfig>;
  isPending: boolean;
  error: Error | null;
};

export type UseDeleteProviderAppConfigReturn = {
  mutate: (id: string) => void;
  isPending: boolean;
  error: Error | null;
};

export type UseTestConnectionReturn = {
  mutate: (input: { provider: string; providerAppConfigId: string }) => void;
  isPending: boolean;
  lastResult: WorkspaceHealthCheckResult | undefined;
  error: Error | null;
};

export type UseInitOAuthReturn = {
  mutateAsync: (input: {
    provider: string;
    providerAppConfigId: string;
    redirectUri: string;
    scopes?: string[];
  }) => Promise<{ authorizationUrl: string; state: string }>;
  isPending: boolean;
  error: Error | null;
};

export type UseOAuthCallbackPageReturn = {
  phase: OAuthCallbackPhase;
  errorMessage: string | undefined;
  connectorName: string | undefined;
};

export type UseAppConfigsPageReturn = {
  t: TranslateFunction;
  providers: WorkspaceProviderDefinition[];
  configs: WorkspaceProviderAppConfig[];
  isLoading: boolean;
  isError: boolean;
  isCreateOpen: boolean;
  form: ProviderAppConfigFormValues;
  fieldErrors: Partial<Record<string, string>>;
  isCreatePending: boolean;
  isDeletePending: boolean;
  isTestPending: boolean;
  testResult: WorkspaceHealthCheckResult | undefined;
  selectedProvider: WorkspaceProviderDefinition | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  setFormField: <K extends keyof ProviderAppConfigFormValues>(
    key: K,
    value: ProviderAppConfigFormValues[K],
  ) => void;
  setFormProvider: (provider: string) => void;
  setFormAuthMode: (mode: WorkspaceProviderAuthMode) => void;
  setPublicField: (key: string, value: string) => void;
  setSecretField: (key: string, value: string) => void;
  handleSubmit: () => Promise<void>;
  handleDelete: (id: string) => void;
  handleTest: (id: string, provider: string) => void;
  handleConnect: (id: string, provider: string) => Promise<void>;
  isConnectPending: boolean;
};
