import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@claw/shared-types';
import { EntityNotFoundException } from '../../../common/errors';
import { PlanModelAccessMode } from '../../../generated/prisma';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { RolesService } from '../../roles/services/roles.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { type PlanWithAccess } from '../../plans/types/plans.types';
import { QuotaService } from '../../quota/services/quota.service';
import { type UserEntitlements } from '../types/entitlements.types';
import { ADMIN_ENTITLEMENT_PLAN } from '../constants/admin-entitlements.constants';

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly rolesService: RolesService,
    private readonly plansRepository: PlansRepository,
    private readonly quotaService: QuotaService,
  ) {}

  // Aggregates role permissions + plan + model access + quota for a user.
  // ADMIN is unrestricted: full permissions, unlimited quota, no model gate.
  async getForUser(userId: string): Promise<UserEntitlements> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    this.logger.debug(`getForUser: resolving entitlements for ${userId}`);

    const isAdmin = user.role === UserRole.ADMIN;
    const permissions = await this.rolesService.resolvePermissionsForUser(user.roleId, user.role);
    const plan = isAdmin ? null : await this.resolvePlan(userId, user.activePlanId);

    const dailyLimit = plan?.dailyTokenQuota ?? 0;
    const quota = isAdmin
      ? { dailyLimit: 0, used: 0, remaining: 0, unlimited: true, adminBypass: true }
      : {
          ...(await this.quotaService.getSnapshot(userId, dailyLimit)),
          unlimited: false,
          adminBypass: false,
        };

    // ALLOW_ALL plans use an empty model list as the unrestricted routing hot
    // path. Explicit policies return only enabled rows; their access mode keeps
    // an empty allow-list or DENY_ALL policy restrictive downstream.
    const modelAccess = (plan?.modelAccess ?? []).filter((m) => m.isAllowed);

    return {
      userId,
      role: user.role,
      isAdmin,
      permissions,
      plan: this.resolveEntitlementPlan(isAdmin, plan),
      modelAccessMode: this.resolveModelAccessMode(isAdmin, plan?.modelAccessMode),
      allowedModels: modelAccess.map((m) => ({
        provider: m.provider,
        model: m.model,
        isAllowed: m.isAllowed,
        allowAsPrimary: m.allowAsPrimary,
        allowAsFallback: m.allowAsFallback,
        allowAsJudge: m.allowAsJudge,
        allowInCompare: m.allowInCompare,
        dailyTokenLimitOverride: m.dailyTokenLimitOverride,
      })),
      allowedProviders: [...new Set(modelAccess.map((m) => m.provider))],
      quota,
    };
  }

  private resolveEntitlementPlan(
    isAdmin: boolean,
    plan: PlanWithAccess | null,
  ): UserEntitlements['plan'] {
    if (isAdmin) {
      return ADMIN_ENTITLEMENT_PLAN;
    }
    return plan === null ? null : this.toEntitlementPlan(plan);
  }

  private async resolvePlan(
    userId: string,
    activePlanId: string | null,
  ): Promise<PlanWithAccess | null> {
    if (activePlanId === null) {
      return null;
    }
    const effectivePlan = await this.plansRepository.findEffectiveForUser(userId, new Date());
    return effectivePlan ?? this.plansRepository.findDefault();
  }

  private toEntitlementPlan(plan: PlanWithAccess): NonNullable<UserEntitlements['plan']> {
    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      limits: {
        dailyTokens: plan.dailyTokenQuota ?? null,
        weeklyTokens: plan.weeklyTokenQuota ?? null,
        monthlyTokens: plan.monthlyTokenQuota ?? null,
        chatsPerDay: plan.maxChatsPerDay ?? null,
      },
      featureGates: {
        allowCompareMode: plan.allowCompareMode,
        allowJudgeMode: plan.allowJudgeMode,
        allowResearchMode: plan.allowResearchMode,
        allowCriticReview: plan.allowCriticReview,
        allowWorkspaces: plan.allowWorkspaces,
        allowMemory: plan.allowMemory,
        allowContextPacks: plan.allowContextPacks,
      },
    };
  }

  private resolveModelAccessMode(
    isAdmin: boolean,
    mode: PlanModelAccessMode | undefined,
  ): PlanModelAccessMode {
    if (isAdmin) {
      return PlanModelAccessMode.ALLOW_ALL;
    }
    return mode ?? PlanModelAccessMode.DENY_ALL;
  }

  // Resolves the user's daily token limit for quota reservation (0 = ADMIN /
  // unlimited handled by caller).
  async resolveDailyLimit(userId: string): Promise<{ dailyLimit: number; isAdmin: boolean }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    if (user.role === UserRole.ADMIN) {
      return { dailyLimit: 0, isAdmin: true };
    }
    const plan = user.activePlanId
      ? await this.plansRepository.findEffectiveForUser(userId, new Date())
      : null;
    return { dailyLimit: plan?.dailyTokenQuota ?? 0, isAdmin: false };
  }
}
