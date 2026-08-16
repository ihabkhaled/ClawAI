import { type User } from '../../../generated/prisma';
import { type SafeUser } from '../types/users.types';

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    isSuperAdmin: user.isSuperAdmin,
    emailVerifiedAt: user.emailVerifiedAt,
    mustChangePassword: user.mustChangePassword,
    languagePreference: user.languagePreference,
    appearancePreference: user.appearancePreference,
    activePlanId: user.activePlanId,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
