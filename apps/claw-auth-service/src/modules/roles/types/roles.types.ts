import { type Permission } from '@claw/shared-types';

export type RoleWithPermissions = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isAssignable: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRoleData = {
  slug: string;
  name: string;
  description?: string;
  isAssignable: boolean;
  permissions: Permission[];
};

export type UpdateRoleData = {
  name?: string;
  description?: string;
  isAssignable?: boolean;
};
