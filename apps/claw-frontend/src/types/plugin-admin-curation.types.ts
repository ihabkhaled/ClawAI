import type {
  AdminAuditRowView,
  AdminRuleKind,
  AdminRuleMatch,
  AdminRuleView,
  AdminServerStatus,
  AdminServerView,
  CuratedEntryView,
  CuratedLocaleText,
  CuratedTransport,
  PluginAuthKindName,
  PluginToolRiskLevel,
} from '@claw/shared-types';

import type { AdminCurationTab } from '@/enums/admin-curation-tab.enum';

export type CurationTranslate = (key: string, params?: Record<string, string | number>) => string;

export type CuratedToolDraft = {
  name: string;
  description: string;
  riskLevel: PluginToolRiskLevel;
  inputSchema?: Record<string, unknown>;
  selected: boolean;
  curatable: boolean;
};

export type CuratedFormValues = {
  slug: string;
  publisher: string;
  category: string;
  iconKey: string;
  homepageUrl: string;
  url: string;
  transport: CuratedTransport;
  authKind: PluginAuthKindName;
  headerName: string;
  oauthAuthorizeUrl: string;
  oauthTokenUrl: string;
  probeCredential: string;
  texts: Record<string, CuratedLocaleText>;
  tools: CuratedToolDraft[];
  allowedPlans: string;
  adminNotes: string;
};

export type CuratedFormTextField = keyof CuratedLocaleText;

export type CuratedFormState = {
  isEdit: boolean;
  values: CuratedFormValues;
  locale: string;
  setLocale: (locale: string) => void;
  setField: <K extends keyof CuratedFormValues>(key: K, value: CuratedFormValues[K]) => void;
  setText: (field: CuratedFormTextField, value: string) => void;
  toggleTool: (name: string, selected: boolean) => void;
  setToolRisk: (name: string, risk: PluginToolRiskLevel) => void;
  preview: () => void;
  isPreviewing: boolean;
  previewed: boolean;
  skippedCount: number;
  save: (publish: boolean) => void;
  isSaving: boolean;
  errorMessage: string | null;
};

export type CuratedEntryDialogProps = {
  open: boolean;
  entry: CuratedEntryView | null;
  onClose: () => void;
  t: CurationTranslate;
};

export type CuratedEntryFormProps = {
  state: CuratedFormState;
  onCancel: () => void;
  t: CurationTranslate;
};

export type UseAdminCurationEntriesReturn = {
  entries: CuratedEntryView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  pendingSlug: string | null;
  errorMessage: string | null;
  setEnabled: (slug: string, enabled: boolean) => void;
  checkHealth: (slug: string) => void;
  remove: (slug: string) => void;
};

export type UseAdminCurationQueueReturn = {
  filter: AdminServerStatus;
  setFilter: (status: AdminServerStatus) => void;
  servers: AdminServerView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  pendingId: string | null;
  errorMessage: string | null;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;
};

export type RuleDraft = {
  kind: AdminRuleKind;
  match: AdminRuleMatch;
  pattern: string;
  note: string;
};

export type UseAdminCurationRulesReturn = {
  rules: AdminRuleView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  draft: RuleDraft;
  setDraft: <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => void;
  add: () => void;
  isAdding: boolean;
  remove: (id: string) => void;
  errorMessage: string | null;
};

export type UseAdminCurationAuditReturn = {
  rows: AdminAuditRowView[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

export type UseAdminCurationDialogsReturn = {
  /** `open` with a null entry is the create form. */
  entryOpen: boolean;
  entry: CuratedEntryView | null;
  openCreate: () => void;
  openEdit: (entry: CuratedEntryView) => void;
  closeEntry: () => void;
  deleteTarget: CuratedEntryView | null;
  askDelete: (entry: CuratedEntryView) => void;
  closeDelete: () => void;
  rejectTarget: AdminServerView | null;
  reason: string;
  setReason: (reason: string) => void;
  askReject: (server: AdminServerView) => void;
  closeReject: () => void;
};

export type UseAdminCurationPageReturn = {
  t: CurationTranslate;
  tab: AdminCurationTab;
  setTab: (tab: AdminCurationTab) => void;
  entries: UseAdminCurationEntriesReturn;
  queue: UseAdminCurationQueueReturn;
  rules: UseAdminCurationRulesReturn;
  audit: UseAdminCurationAuditReturn;
  dialogs: UseAdminCurationDialogsReturn;
};

export type AdminCurationTabProps<T> = { state: T; t: CurationTranslate };

export type AdminCurationSelectOption = { value: string; label: string };

export type AdminCurationSelectProps = {
  id: string;
  label: string;
  value: string;
  options: readonly AdminCurationSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export type AdminCurationRejectDialogProps = {
  server: AdminServerView | null;
  reason: string;
  onReason: (reason: string) => void;
  busy: boolean;
  onConfirm: (id: string, reason: string) => void;
  onClose: () => void;
  t: CurationTranslate;
};

export type AdminCurationDeleteDialogProps = {
  entry: CuratedEntryView | null;
  onConfirm: (slug: string) => void;
  onClose: () => void;
  t: CurationTranslate;
};

export type AdminCurationListStateProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyKey: string;
  retry: () => void;
  t: CurationTranslate;
  children: React.ReactNode;
};

export type AdminCurationEntryRowProps = {
  entry: CuratedEntryView;
  busy: boolean;
  onEnabled: (slug: string, enabled: boolean) => void;
  onHealth: (slug: string) => void;
  onEdit: (entry: CuratedEntryView) => void;
  onDelete: (entry: CuratedEntryView) => void;
  t: CurationTranslate;
};

export type AdminCurationQueueRowProps = {
  server: AdminServerView;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (server: AdminServerView) => void;
  t: CurationTranslate;
};

export type AdminCurationEntriesTabProps = AdminCurationTabProps<UseAdminCurationEntriesReturn> & {
  dialogs: UseAdminCurationDialogsReturn;
};

export type AdminCurationQueueTabProps = AdminCurationTabProps<UseAdminCurationQueueReturn> & {
  dialogs: UseAdminCurationDialogsReturn;
};

export type AdminCurationEntryBodyProps = {
  entry: CuratedEntryView | null;
  onClose: () => void;
  t: CurationTranslate;
};

export type AdminCurationToolsEditorProps = {
  state: CuratedFormState;
  t: CurationTranslate;
};

export type CurationEntryAction =
  | { kind: 'enable'; slug: string; enabled: boolean }
  | { kind: 'health'; slug: string }
  | { kind: 'remove'; slug: string };

export type CurationQueueAction = { id: string; reason: string | null };
