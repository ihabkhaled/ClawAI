import { type UserRole, type UserStatus } from "../../../common/enums";

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListUsersQuery {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
