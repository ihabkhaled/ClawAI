import type {
  InstallPluginRequest,
  PluginAdminCatalogEntryView,
  PluginInstallView,
  PluginSettingView,
  PluginToolRiskLevel,
} from '@claw/shared-types';

import type { AdminPluginsTab } from '@/enums/admin-plugins-tab.enum';
import type { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import type { PluginSettingsFieldKind } from '@/enums/plugin-settings-field-kind.enum';
import type { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import type { PlanView } from '@/types/plan.types';

import type { PluginCatalogDetail, PluginsTranslate } from './plugins.types';

/** The consent levels a user can grant: READ tools never ask. */
export type PluginConsentLevel = Exclude<PluginToolRiskLevel, 'READ'>;

/** One generated settings field, drawn from the manifest settingsSchema subset. */
export type PluginSettingsField = {
  key: string;
  kind: PluginSettingsFieldKind;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  min: number | undefined;
  max: number | undefined;
  /** The schema minLength / maxLength of a text field. */
  minLength: number | undefined;
  maxLength: number | undefined;
  integer: boolean;
  /** The schema default, as the draft holds it: text for text, number and select, a boolean otherwise. */
  fallback: string | boolean;
};

/** A settings draft as typed: text and numbers are strings, a boolean is a boolean. */
export type PluginSettingsDraft = Record<string, string | boolean>;

/** `values` holds the parsed settings; `errors` holds a translation key per field that failed. */
export type PluginSettingsValidation = {
  values: Record<string, unknown>;
  errors: Record<string, string>;
};

export type PluginInstallGateInput = {
  alreadyInstalled: boolean;
  globallyDisabled: boolean;
  planAllows: boolean;
  /** null = unlimited, 0 = disabled, undefined = the plan did not say (the server decides). */
  cap: number | null | undefined;
  installedCount: number;
};

export type PluginInstallGate = {
  reason: PluginInstallGateReason;
  canInstall: boolean;
};

export type UsePluginInstallsReturn = {
  installs: PluginInstallView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

export type UsePluginInstallPanelReturn = {
  t: PluginsTranslate;
  install: PluginInstallView | undefined;
  gate: PluginInstallGate;
  limit: number | null | undefined;
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  credential: string;
  setCredential: (value: string) => void;
  needsCredential: boolean;
  canConfirm: boolean;
  isInstalling: boolean;
  errorMessage: string | null;
  confirm: () => void;
};

export type UseInstalledPluginsReturn = {
  t: PluginsTranslate;
  installs: PluginInstallView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  settingsFor: PluginInstallView | undefined;
  openSettings: (install: PluginInstallView) => void;
  closeSettings: () => void;
  uninstallFor: PluginInstallView | undefined;
  askUninstall: (install: PluginInstallView) => void;
  cancelUninstall: () => void;
  confirmUninstall: () => void;
  isUninstalling: boolean;
  pendingId: string | null;
  setEnabled: (install: PluginInstallView, enabled: boolean) => void;
  errorMessage: string | null;
};

export type UsePluginSettingsSheetReturn = {
  t: PluginsTranslate;
  plugin: PluginCatalogDetail | undefined;
  isLoading: boolean;
  fields: PluginSettingsField[];
  draft: PluginSettingsDraft;
  errors: Record<string, string>;
  setDraftValue: (key: string, value: string | boolean) => void;
  save: () => void;
  isSaving: boolean;
  credentialDraft: string;
  setCredentialDraft: (value: string) => void;
  saveCredential: () => void;
  removeCredential: () => void;
  isCredentialBusy: boolean;
  grantConsent: (toolName: string, level: PluginConsentLevel) => void;
  revokeConsent: (toolName: string) => void;
  isConsentBusy: boolean;
  errorMessage: string | null;
};

export type PluginInstallButtonProps = {
  gate: PluginInstallGate;
  install: PluginInstallView | undefined;
  limit: number | null | undefined;
  onOpen: () => void;
  t: PluginsTranslate;
};

export type PluginInstallDialogProps = {
  plugin: PluginCatalogDetail;
  panel: UsePluginInstallPanelReturn;
};

export type PluginCredentialInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hasCredential: boolean;
  t: PluginsTranslate;
};

export type InstalledPluginCardProps = {
  install: PluginInstallView;
  isPending: boolean;
  onToggle: (install: PluginInstallView, enabled: boolean) => void;
  onSettings: (install: PluginInstallView) => void;
  onUninstall: (install: PluginInstallView) => void;
  t: PluginsTranslate;
};

export type PluginSettingsSheetProps = {
  install: PluginInstallView;
  onClose: () => void;
};

export type PluginSettingsFormProps = {
  fields: PluginSettingsField[];
  draft: PluginSettingsDraft;
  errors: Record<string, string>;
  onChange: (key: string, value: string | boolean) => void;
  t: PluginsTranslate;
};

export type PluginConsentListProps = {
  tools: PluginCatalogDetail['tools'];
  install: PluginInstallView;
  busy: boolean;
  onGrant: (toolName: string, level: PluginConsentLevel) => void;
  onRevoke: (toolName: string) => void;
  t: PluginsTranslate;
};

export type PluginUninstallDialogProps = {
  install: PluginInstallView | undefined;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: PluginsTranslate;
};

export type PluginsNavProps = { active: PluginsNavTab; t: PluginsTranslate };

export type UseAdminPluginCatalogReturn = {
  entries: PluginAdminCatalogEntryView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  pendingSlug: string | null;
  setGloballyEnabled: (slug: string, enabled: boolean) => void;
  setFeatured: (slug: string, featured: boolean) => void;
  setToolDisabled: (slug: string, toolName: string, disabled: boolean) => void;
  errorMessage: string | null;
};

export type UseAdminPluginSettingsReturn = {
  settings: PluginSettingView[];
  draft: PluginSettingsDraft;
  errors: Record<string, string>;
  setDraftValue: (key: string, value: string | boolean) => void;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  isDirty: boolean;
  isSaving: boolean;
  save: () => void;
  reset: () => void;
  errorMessage: string | null;
  saved: boolean;
};

export type AdminPluginCatalogRowProps = {
  entry: PluginAdminCatalogEntryView;
  busy: boolean;
  onGloballyEnabled: (slug: string, enabled: boolean) => void;
  onFeatured: (slug: string, featured: boolean) => void;
  onToolDisabled: (slug: string, toolName: string, disabled: boolean) => void;
  t: PluginsTranslate;
};

export type AdminPluginSettingRowProps = {
  setting: PluginSettingView;
  value: string | boolean;
  error: string | undefined;
  onChange: (key: string, value: string | boolean) => void;
  t: PluginsTranslate;
};

export type PlanNullableLimitFieldProps = {
  id: string;
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  unlimitedLabel: string;
  placeholder: string;
};

/** What the install mutation takes: the request, plus the typed API key or an empty string. */
export type InstallPluginInput = { request: InstallPluginRequest; credential: string };

export type UseAdminPluginsPageReturn = {
  t: PluginsTranslate;
  tab: AdminPluginsTab;
  setTab: (tab: AdminPluginsTab) => void;
  catalog: UseAdminPluginCatalogReturn;
  settings: UseAdminPluginSettingsReturn;
};

export type PluginInstallPanelProps = { plugin: PluginCatalogDetail };

export type PluginSettingsFieldProps = {
  field: PluginSettingsField;
  value: string | boolean;
  error: string | undefined;
  onChange: (key: string, value: string | boolean) => void;
  t: PluginsTranslate;
};

export type PluginCredentialSectionProps = {
  install: PluginInstallView;
  sheet: UsePluginSettingsSheetReturn;
};

export type PluginConsentRowProps = {
  tool: PluginCatalogDetail['tools'][number];
  granted: boolean;
  busy: boolean;
  onGrant: (toolName: string, level: PluginConsentLevel) => void;
  onRevoke: (toolName: string) => void;
  t: PluginsTranslate;
};

export type AdminPluginCatalogTabProps = {
  catalog: UseAdminPluginCatalogReturn;
  t: PluginsTranslate;
};

export type AdminPluginSettingsTabProps = {
  settings: UseAdminPluginSettingsReturn;
  t: PluginsTranslate;
};

export type PlanPluginLimitsProps = { plan: PlanView; t: PluginsTranslate };
