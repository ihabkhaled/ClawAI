import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rolesRepository } from '@/repositories/admin/roles.repository';
import type {
  CreateRoleRequest,
  PermissionCatalog,
  RoleWithPermissions,
  UpdateRolePermissionsRequest,
  UpdateRoleRequest,
} from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const sampleRole = { id: 'r1', slug: 'editor', permissions: [] } as unknown as RoleWithPermissions;

describe('roles repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPermissions GETs the permissions sub-path', async () => {
    const catalog: PermissionCatalog = { permissions: ['CHAT_READ'] };
    mockGet.mockResolvedValue({ data: catalog });
    const result = await rolesRepository.listPermissions();
    expect(mockGet).toHaveBeenCalledWith('/admin/roles/permissions');
    expect(result).toEqual(catalog);
  });

  it('list GETs the base path', async () => {
    mockGet.mockResolvedValue({ data: [sampleRole] });
    const result = await rolesRepository.list();
    expect(mockGet).toHaveBeenCalledWith('/admin/roles');
    expect(result).toEqual([sampleRole]);
  });

  it('get GETs the encoded id path', async () => {
    mockGet.mockResolvedValue({ data: sampleRole });
    const result = await rolesRepository.get('r 1');
    expect(mockGet).toHaveBeenCalledWith('/admin/roles/r%201');
    expect(result).toEqual(sampleRole);
  });

  it('create POSTs the payload to the base path', async () => {
    mockPost.mockResolvedValue({ data: sampleRole });
    const payload: CreateRoleRequest = { slug: 'editor', name: 'Editor' };
    const result = await rolesRepository.create(payload);
    expect(mockPost).toHaveBeenCalledWith('/admin/roles', payload);
    expect(result).toEqual(sampleRole);
  });

  it('update PATCHes the payload to the encoded id path', async () => {
    mockPatch.mockResolvedValue({ data: sampleRole });
    const payload: UpdateRoleRequest = { name: 'Renamed' };
    const result = await rolesRepository.update('r 1', payload);
    expect(mockPatch).toHaveBeenCalledWith('/admin/roles/r%201', payload);
    expect(result).toEqual(sampleRole);
  });

  it('updatePermissions PUTs the payload to the permissions sub-path', async () => {
    mockPut.mockResolvedValue({ data: sampleRole });
    const payload: UpdateRolePermissionsRequest = { permissions: ['CHAT_READ', 'CHAT_WRITE'] };
    const result = await rolesRepository.updatePermissions('r 1', payload);
    expect(mockPut).toHaveBeenCalledWith('/admin/roles/r%201/permissions', payload);
    expect(result).toEqual(sampleRole);
  });

  it('remove DELETEs the encoded id path', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await rolesRepository.remove('r/1');
    expect(mockDelete).toHaveBeenCalledWith('/admin/roles/r%2F1');
  });
});
