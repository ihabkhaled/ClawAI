import type { TranslateFunction } from './i18n.types';

// ─── Backend DTO mirrors (claw-auth-service roles) ───────────────────────────

export type RoleWithPermissions = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isAssignable: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type PermissionCatalog = {
  permissions: string[];
};

export type CreateRoleRequest = {
  slug: string;
  name: string;
  description?: string;
  isAssignable?: boolean;
  permissions?: string[];
};

export type UpdateRoleRequest = {
  name?: string;
  description?: string;
  isAssignable?: boolean;
};

export type UpdateRolePermissionsRequest = {
  permissions: string[];
};

// ─── Role form state ──────────────────────────────────────────────────────────

export type RoleFormState = {
  slug: string;
  name: string;
  description: string;
  isAssignable: boolean;
};

export type RoleFormFieldErrors = Partial<Record<keyof RoleFormState, string>>;

export type UseRoleFormResult = {
  state: RoleFormState;
  setField: <K extends keyof RoleFormState>(field: K, value: RoleFormState[K]) => void;
  fieldErrors: RoleFormFieldErrors;
  buildCreateRequest: () => CreateRoleRequest | null;
};

// ─── Permission grouping ──────────────────────────────────────────────────────

export type PermissionGroup = {
  groupKey: string;
  permissions: string[];
};

// ─── Controller hook return shapes ────────────────────────────────────────────

export type UseRolesPageResult = {
  roles: RoleWithPermissions[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  pendingId: string | null;
  mutationError: Error | null;
  clearMutationError: () => void;
  onDeleteRole: (id: string) => void;
  onRetry: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  isCreating: boolean;
  submitCreate: (payload: CreateRoleRequest) => void;
  openCreate: () => void;
};

export type UseRoleDetailPageResult = {
  role: RoleWithPermissions | null;
  groups: PermissionGroup[];
  selected: Set<string>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isDirty: boolean;
  isSaving: boolean;
  saveError: Error | null;
  togglePermission: (permission: string) => void;
  selectGroup: (groupKey: string, next: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
  onRetry: () => void;
};

// ─── Component prop types ─────────────────────────────────────────────────────

export type RoleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitCreate: (payload: CreateRoleRequest) => void;
  isSubmitting: boolean;
  submitErrorMessage: string | null;
  t: TranslateFunction;
};

export type PermissionMatrixProps = {
  groups: PermissionGroup[];
  selected: Set<string>;
  togglePermission: (permission: string) => void;
  selectGroup: (groupKey: string, next: boolean) => void;
  disabled: boolean;
  t: TranslateFunction;
};

export type RoleRowProps = {
  role: RoleWithPermissions;
  pendingId: string | null;
  onDelete: (id: string) => void;
  detailHref: string;
  t: TranslateFunction;
};

export type PermissionGroupSectionProps = {
  group: PermissionGroup;
  selected: Set<string>;
  togglePermission: (permission: string) => void;
  selectGroup: (groupKey: string, next: boolean) => void;
  disabled: boolean;
  t: TranslateFunction;
};
