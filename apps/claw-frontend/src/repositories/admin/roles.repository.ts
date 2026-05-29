import { apiClient } from '@/services/shared/api-client';
import type {
  CreateRoleRequest,
  PermissionCatalog,
  RoleWithPermissions,
  UpdateRolePermissionsRequest,
  UpdateRoleRequest,
} from '@/types';

const ROLES_BASE = '/admin/roles';

export const rolesRepository = {
  async listPermissions(): Promise<PermissionCatalog> {
    const response = await apiClient.get<PermissionCatalog>(`${ROLES_BASE}/permissions`);
    return response.data;
  },

  async list(): Promise<RoleWithPermissions[]> {
    const response = await apiClient.get<RoleWithPermissions[]>(ROLES_BASE);
    return response.data;
  },

  async get(id: string): Promise<RoleWithPermissions> {
    const response = await apiClient.get<RoleWithPermissions>(
      `${ROLES_BASE}/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async create(payload: CreateRoleRequest): Promise<RoleWithPermissions> {
    const response = await apiClient.post<RoleWithPermissions>(ROLES_BASE, payload);
    return response.data;
  },

  async update(id: string, payload: UpdateRoleRequest): Promise<RoleWithPermissions> {
    const response = await apiClient.patch<RoleWithPermissions>(
      `${ROLES_BASE}/${encodeURIComponent(id)}`,
      payload,
    );
    return response.data;
  },

  async updatePermissions(
    id: string,
    payload: UpdateRolePermissionsRequest,
  ): Promise<RoleWithPermissions> {
    const response = await apiClient.put<RoleWithPermissions>(
      `${ROLES_BASE}/${encodeURIComponent(id)}/permissions`,
      payload,
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${ROLES_BASE}/${encodeURIComponent(id)}`);
  },
};
