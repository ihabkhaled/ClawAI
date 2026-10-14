import type { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import type { PluginServerAuthKind } from '@/enums/plugin-server-auth-kind.enum';
import type { PluginServerCapState } from '@/enums/plugin-server-cap-state.enum';
import type { PluginServerDialogStep } from '@/enums/plugin-server-dialog-step.enum';

import type { PluginsTranslate } from './plugins.types';

/**
 * One tool a user's own MCP server exposes. `enabled` is the user's choice; `riskLevel`
 * starts at WRITE because the server's own hints are untrusted (design section 4).
 */
export type PluginServerTool = {
  name: string;
  description: string;
  riskLevel: PluginRiskLevel;
  enabled: boolean;
};

/** A user's own MCP server, as the page uses it. `status` stays a string so a new server status still renders. */
export type PluginServerView = {
  id: string;
  name: string;
  url: string;
  status: string;
  enabled: boolean;
  hasCredential: boolean;
  tools: PluginServerTool[];
  toolCount: number;
};

/**
 * Plan cap on own servers: `undefined` = the server did not say (no cap is shown or enforced),
 * `null` = unlimited, `0` = the plan has no own servers, a positive number = that many.
 */
export type PluginServerLimit = number | null | undefined;

export type PluginServerList = {
  servers: PluginServerView[];
  limit: PluginServerLimit;
};

/** What the Add dialog sends. The header value is write-only and never read back. */
export type CreatePluginServerRequest = {
  name: string;
  url: string;
  authKind: PluginServerAuthKind;
  credential?: { headerName: string; value: string };
  acknowledgedRisk: true;
};

export type UpdatePluginServerRequest = {
  name?: string;
  enabled?: boolean;
  tools?: Array<{ name: string; enabled: boolean; riskLevel: PluginRiskLevel }>;
};

export type PluginServerCap = {
  state: PluginServerCapState;
  current: number;
  limit: number | null;
  /** True when another server can be added. */
  canAdd: boolean;
};

export type PluginServerFormValues = {
  name: string;
  url: string;
  headerName: string;
  headerValue: string;
  acknowledged: boolean;
};

/** The variables of an update call: which server, and what changes. */
export type UpdatePluginServerVariables = { id: string; body: UpdatePluginServerRequest };

export type UsePluginServersReturn = {
  list: PluginServerList;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

export type UsePluginServersPageReturn = {
  t: PluginsTranslate;
  servers: PluginServerView[];
  cap: PluginServerCap;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  errorMessage: string | null;
  pendingId: string | null;
  setEnabled: (server: PluginServerView, enabled: boolean) => void;
  addOpen: boolean;
  openAdd: () => void;
  closeAdd: () => void;
  toolsFor: PluginServerView | undefined;
  openTools: (server: PluginServerView) => void;
  closeTools: () => void;
  removeFor: PluginServerView | undefined;
  askRemove: (server: PluginServerView) => void;
  cancelRemove: () => void;
  confirmRemove: () => void;
  isRemoving: boolean;
};

export type UseAddPluginServerDialogReturn = {
  step: PluginServerDialogStep;
  values: PluginServerFormValues;
  setValue: <K extends keyof PluginServerFormValues>(
    key: K,
    value: PluginServerFormValues[K],
  ) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submit: () => void;
  errorMessage: string | null;
  created: PluginServerView | undefined;
};

export type UsePluginServerToolsReturn = {
  tools: PluginServerTool[];
  isDiscovering: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  toggle: (name: string, enabled: boolean) => void;
  rediscover: () => void;
  save: () => void;
};

export type PluginServerStatusBadgeProps = { status: string; t: PluginsTranslate };
export type PluginServerCapBadgeProps = { cap: PluginServerCap; t: PluginsTranslate };

export type PluginServerCardProps = {
  server: PluginServerView;
  isPending: boolean;
  onToggle: (server: PluginServerView, enabled: boolean) => void;
  onTools: (server: PluginServerView) => void;
  onRemove: (server: PluginServerView) => void;
  t: PluginsTranslate;
};

export type PluginServerToolRowProps = {
  tool: PluginServerTool;
  onToggle: (name: string, enabled: boolean) => void;
  t: PluginsTranslate;
};

export type PluginServerToolsPanelProps = {
  server: PluginServerView;
  onDone: () => void;
  t: PluginsTranslate;
};

export type PluginServerToolsDialogProps = {
  server: PluginServerView | undefined;
  onClose: () => void;
  t: PluginsTranslate;
};

export type AddPluginServerDialogProps = {
  open: boolean;
  onClose: () => void;
  t: PluginsTranslate;
};

export type AddPluginServerBodyProps = { onClose: () => void; t: PluginsTranslate };

export type PluginServerRemoveDialogProps = {
  server: PluginServerView | undefined;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: PluginsTranslate;
};

export type AddPluginServerFormProps = {
  state: UseAddPluginServerDialogReturn;
  onCancel: () => void;
  t: PluginsTranslate;
};
