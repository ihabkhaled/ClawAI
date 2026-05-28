import { describe, expect, it } from 'vitest';

import { Permission, UserRole } from '@/enums';
import type { UserProfile } from '@/types';

import { hasAnyPermission, hasPermission, isAdmin } from '../permissions.utility';

const make = (role: UserRole, permissions?: Permission[]): UserProfile =>
  ({
    id: 'u1',
    email: 'u@x.com',
    username: 'u',
    role,
    permissions,
    mustChangePassword: false,
    languagePreference: 'EN',
    appearancePreference: 'SYSTEM',
  }) as unknown as UserProfile;

describe('permissions.utility', () => {
  it('isAdmin true only for ADMIN role', () => {
    expect(isAdmin(make(UserRole.ADMIN))).toBe(true);
    expect(isAdmin(make(UserRole.USER))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it('ADMIN implicitly has every permission regardless of grants', () => {
    const admin = make(UserRole.ADMIN, []);
    expect(hasPermission(admin, Permission.ADMIN_PLANS_MANAGE)).toBe(true);
    expect(hasPermission(admin, Permission.CHAT_USE)).toBe(true);
  });

  it('USER has only granted permissions', () => {
    const user = make(UserRole.USER, [Permission.CHAT_USE, Permission.MEMORY_USE]);
    expect(hasPermission(user, Permission.CHAT_USE)).toBe(true);
    expect(hasPermission(user, Permission.ADMIN_PLANS_MANAGE)).toBe(false);
  });

  it('null user has no permissions', () => {
    expect(hasPermission(null, Permission.CHAT_USE)).toBe(false);
  });

  it('user with undefined permissions array denies everything', () => {
    const user = make(UserRole.USER, undefined);
    expect(hasPermission(user, Permission.CHAT_USE)).toBe(false);
  });

  it('hasAnyPermission is true if at least one matches', () => {
    const user = make(UserRole.USER, [Permission.MEMORY_USE]);
    expect(hasAnyPermission(user, [Permission.CHAT_USE, Permission.MEMORY_USE])).toBe(true);
    expect(hasAnyPermission(user, [Permission.ADMIN_PLANS_MANAGE])).toBe(false);
  });
});
