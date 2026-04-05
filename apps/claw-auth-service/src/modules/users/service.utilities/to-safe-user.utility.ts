import { type User } from "../../../generated/prisma";
import { type SafeUser } from "../types/users.types";

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    languagePreference: user.languagePreference,
    appearancePreference: user.appearancePreference,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
