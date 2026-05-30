import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@claw/shared-types';
import { EntityNotFoundException } from '../../../common/errors';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { RolesService } from '../../roles/services/roles.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { QuotaService } from '../../quota/services/quota.service';
import { type UserEntitlements } from '../types/entitlements.types';

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
    const plan = user.activePlanId ? await this.plansRepository.findById(user.activePlanId) : null;

    const dailyLimit = plan?.dailyTokenQuota ?? 0;
    const quota = isAdmin
      ? { dailyLimit: 0, used: 0, remaining: 0, unlimited: true }
      : { ...(await this.quotaService.getSnapshot(userId, dailyLimit)), unlimited: false };

    // PlanModelAccess contract: an EMPTY rows array means "no model restriction
    // configured" — every plan tier sees every connector model. A POPULATED rows
    // array restricts the user to ONLY those entries with isAllowed=true. This is
    // an admin-only restriction surface; until an admin explicitly inserts
    // restrictive rows for a plan, the frontend ModelSelector receives the full
    // catalog from GET /connectors/available-models (no plan-feature gating on
    // model SELECTION — feature gates govern WORKFLOWS like compare/judge).
    const modelAccess = (plan?.modelAccess ?? []).filter((m) => m.isAllowed);

    return {
      userId,
      role: user.role,
      isAdmin,
      permissions,
      plan: plan
        ? {
            id: plan.id,
            slug: plan.slug,
            name: plan.name,
            featureGates: {
              allowCompareMode: plan.allowCompareMode,
              allowJudgeMode: plan.allowJudgeMode,
              allowResearchMode: plan.allowResearchMode,
              allowCriticReview: plan.allowCriticReview,
              allowWorkspaces: plan.allowWorkspaces,
              allowMemory: plan.allowMemory,
              allowContextPacks: plan.allowContextPacks,
            },
          }
        : null,
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
    const plan = user.activePlanId ? await this.plansRepository.findById(user.activePlanId) : null;
    return { dailyLimit: plan?.dailyTokenQuota ?? 0, isAdmin: false };
  }
}
