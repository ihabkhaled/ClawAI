import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  Prisma,
  User,
  UserAppearancePreference,
  UserLanguagePreference,
} from '../../../generated/prisma';
import { SortOrder } from '../../../common/enums';
import { type UpdateUserData, type UserFilters } from '../types/users.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findAll(params: {
    skip: number;
    take: number;
    filters?: UserFilters;
    sortBy?: string;
    sortOrder?: SortOrder;
  }): Promise<{ users: User[]; total: number }> {
    const where = this.buildWhereClause(params.filters);
    const orderBy = { [params.sortBy ?? 'createdAt']: params.sortOrder ?? SortOrder.DESC };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  async updateById(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async revokeSessionsByUserId(userId: string, revokedAt = new Date()): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }

  // Renaming an account is not a credential change, so the device doing the
  // rename keeps its session. Every other device still holds a token minted
  // against the old identity and is signed out.
  async revokeOtherSessionsByUserId(
    userId: string,
    keepSessionId: string,
    revokedAt = new Date(),
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: keepSessionId } },
      data: { revokedAt },
    });
    return result.count;
  }

  async countAll(filters?: UserFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.user.count({ where });
  }

  async updatePreferences(
    userId: string,
    data: {
      languagePreference?: UserLanguagePreference;
      appearancePreference?: UserAppearancePreference;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  private buildWhereClause(filters?: UserFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.planId) {
      where.activePlanId = filters.planId;
    }

    if (filters?.verification) {
      where.emailVerifiedAt = filters.verification === 'VERIFIED' ? { not: null } : null;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
