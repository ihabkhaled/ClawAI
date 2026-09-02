import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { PlansRepository } from '../repositories/plans.repository';
import { ExposedModelClient } from '../clients/exposed-model.client';
import { EXPOSED_MODEL_VALIDATION_MAX_PAIRS } from '../constants/exposed-model.constants';
import { PLAN_QUOTA_WINDOWS_INCOHERENT } from '../constants/quota-window.constants';
import {
  PLAN_GRANT_DURATION_INVALID,
  PLAN_GRANT_MAX_DURATION_MONTHS,
  PLAN_GRANT_REASON_REQUIRED,
} from '../constants/plan-grant.constants';
import {
  describeQuotaWindowConflicts,
  findQuotaWindowConflicts,
} from '../utilities/quota-window-coherence.utility';
import type { QuotaWindowQuotas } from '../types/quota-window.types';
import { type CreatePlanDto } from '../dto/create-plan.dto';
import { type UpdatePlanDto } from '../dto/update-plan.dto';
import { type SetPlanModelAccessDto } from '../dto/plan-misc.dto';
import { pendingRetirementMigrationsSchema } from '../dto/plan-retirement.dto';
import { PlanLifecycleStatus, type PlanRetirementMigrationStatus } from '../../../generated/prisma';
import {
  type PendingPlanRetirementMigration,
  type PlanFeatureGates,
  type PlanModelAccessView,
  type PlanRetirementResult,
  type PlanView,
  type PlanWithAccess,
} from '../types/plans.types';
import { SuperAdminMutationScope } from '../../../common/enums/super-admin-mutation-scope.enum';
import {
  SUPER_ADMIN_IMMUTABLE_CODE,
  SUPER_ADMIN_IMMUTABLE_MESSAGE,
  SUPER_ADMIN_REFUSED_SELF_ACTION,
  SUPER_ADMIN_REFUSED_TARGET_ACTION,
  SUPER_ADMIN_SELF_LOCKED_CODE,
  SUPER_ADMIN_SELF_LOCKED_MESSAGE,
} from '../../../common/constants/super-admin.constants';
import { resolveSuperAdminMutability } from '../../users/service.utilities/super-admin-mutability.utility';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly exposedModels: ExposedModelClient,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'auth-service',
      EventPattern.LOG_SERVER,
      PlansService.name,
    );
  }

  async listPlans(): Promise<PlanView[]> {
    const plans = await this.plansRepository.findAll();
    return plans.map((plan) => this.toView(plan));
  }

  async getPlan(id: string): Promise<PlanView> {
    const plan = await this.plansRepository.findById(id);
    if (!plan) {
      throw new EntityNotFoundException('Plan', id);
    }
    return this.toView(plan);
  }

  // The active public default plan new users are assigned to. Throws a clear
  // error if an admin has not configured one.
  async getDefaultPlan(): Promise<PlanView> {
    const plan = await this.plansRepository.findDefault();
    if (!plan) {
      throw new BusinessException(
        'No default plan configured',
        'NO_DEFAULT_PLAN',
        HttpStatus.CONFLICT,
      );
    }
    return this.toView(plan);
  }

  /**
   * Refuses a plan whose shorter window allows more than its longer one.
   *
   * The shorter cap is then unreachable — the longer ceiling binds first — and
   * it is the shorter figure the pricing card leads with, so the plan advertises
   * an allowance it never grants.
   */
  private assertQuotaWindowsCoherent(quotas: QuotaWindowQuotas, slug: string): void {
    const conflicts = findQuotaWindowConflicts(quotas);
    if (conflicts.length === 0) {
      return;
    }
    const detail = describeQuotaWindowConflicts(conflicts);
    this.logger.warn(`assertQuotaWindowsCoherent: slug=${slug} ${detail}`);
    throw new BusinessException(
      `A shorter quota window cannot allow more than a longer one: ${detail}`,
      PLAN_QUOTA_WINDOWS_INCOHERENT,
      HttpStatus.BAD_REQUEST,
    );
  }

  async createPlan(dto: CreatePlanDto): Promise<PlanView> {
    this.assertQuotaWindowsCoherent(dto, dto.slug);
    const existing = await this.plansRepository.findBySlug(dto.slug);
    if (existing) {
      throw new BusinessException(
        'Plan slug already exists',
        'PLAN_SLUG_TAKEN',
        HttpStatus.CONFLICT,
      );
    }
    this.logger.log(`createPlan: slug=${dto.slug}`);
    const plan = await this.plansRepository.create(dto);
    return this.toView(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<PlanView> {
    const current = await this.getPlan(id);
    // Merged against the stored row, not checked alone: an update carries only
    // what changed, so raising the weekly cap on its own would otherwise be
    // judged with no daily cap to compare it to.
    this.assertQuotaWindowsCoherent(
      {
        dailyTokenQuota: dto.dailyTokenQuota ?? current.dailyTokenQuota,
        weeklyTokenQuota: dto.weeklyTokenQuota ?? current.weeklyTokenQuota,
        monthlyTokenQuota: dto.monthlyTokenQuota ?? current.monthlyTokenQuota,
      },
      current.slug,
    );
    const plan = await this.plansRepository.update(id, dto);
    this.logger.log(`updatePlan: id=${id}`);
    return this.toView(plan);
  }

  async activatePlan(id: string): Promise<PlanView> {
    const plan = await this.getPlan(id);
    if (plan.lifecycleStatus === PlanLifecycleStatus.RETIRED) {
      throw new BusinessException(
        'A retired plan cannot be activated',
        'PLAN_RETIRED',
        HttpStatus.CONFLICT,
      );
    }
    await this.plansRepository.setActive(id, true);
    return this.getPlan(id);
  }

  async deactivatePlan(id: string): Promise<PlanView> {
    const plan = await this.getPlan(id);
    if (plan.isDefault) {
      throw new BusinessException(
        'Set another plan as default before deactivating this one',
        'PLAN_IS_DEFAULT',
        HttpStatus.CONFLICT,
      );
    }
    await this.plansRepository.setActive(id, false);
    return this.getPlan(id);
  }

  async retirePlan(id: string, requestedReplacementId?: string): Promise<PlanRetirementResult> {
    const source = await this.getPlan(id);
    if (source.isDefault) {
      throw new BusinessException(
        'Set another plan as default before removing this one',
        'PLAN_IS_DEFAULT',
        HttpStatus.CONFLICT,
      );
    }
    if (
      source.lifecycleStatus === PlanLifecycleStatus.RETIRED &&
      source.replacementPlanId !== null
    ) {
      return this.plansRepository.retirePlan(id, source.replacementPlanId);
    }
    const replacement = requestedReplacementId
      ? await this.plansRepository.findById(requestedReplacementId)
      : await this.plansRepository.findRetirementReplacement(id);
    if (!replacement || replacement.id === id || !replacement.isActive) {
      throw new BusinessException(
        'An active upper replacement plan is required',
        'PLAN_REPLACEMENT_REQUIRED',
        HttpStatus.CONFLICT,
      );
    }
    this.logger.warn(`retirePlan: source=${id} replacement=${replacement.id}`);
    return this.plansRepository.retirePlan(id, replacement.id);
  }

  async listPendingRetirementMigrations(limit: number): Promise<PendingPlanRetirementMigration[]> {
    const migrations = await this.plansRepository.listPendingRetirementMigrations(limit);
    return pendingRetirementMigrationsSchema.parse(migrations);
  }

  async recordRetirementMigrationOutcome(
    id: string,
    status: PlanRetirementMigrationStatus,
    errorCode?: string,
  ): Promise<{ applied: boolean }> {
    return {
      applied: await this.plansRepository.recordRetirementMigrationOutcome(id, status, errorCode),
    };
  }

  async setDefault(id: string): Promise<PlanView> {
    await this.getPlan(id);
    await this.plansRepository.makeDefault(id);
    this.logger.log(`setDefault: id=${id}`);
    return this.getPlan(id);
  }

  /**
   * Moves the "Most popular" badge.
   *
   * A separate endpoint from setDefault on purpose: one flag was serving both
   * the signup grant and the marketing badge, so the badge always followed
   * whichever plan signups happened to receive. Splitting the write path is what
   * makes the two decisions independently settable.
   */
  async setPopular(id: string): Promise<PlanView> {
    await this.getPlan(id);
    await this.plansRepository.makePopular(id);
    this.logger.log(`setPopular: id=${id}`);
    return this.getPlan(id);
  }

  async clearPopular(): Promise<PlanView[]> {
    await this.plansRepository.clearPopular();
    this.logger.log('clearPopular: no plan is badged');
    return this.listPlans();
  }

  async reorder(orderedIds: string[]): Promise<PlanView[]> {
    await this.plansRepository.reorder(orderedIds);
    return this.listPlans();
  }

  async assignUserToPlan(
    userId: string,
    planId: string,
    assignedBy: string,
    durationMonths?: number,
    grantReason?: string,
  ): Promise<PlanView> {
    // The admin table already disables this control for the super administrator,
    // but the endpoint accepted any userId, so the protection was decorative.
    // The super administrator bypasses plans entirely, so PLAN is refused even
    // when they are the actor.
    await this.assertPlanAssignable(userId, assignedBy);
    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new EntityNotFoundException('Plan', planId);
    }
    if (!plan.isActive) {
      throw new BusinessException(
        'Cannot assign an inactive plan',
        'PLAN_INACTIVE',
        HttpStatus.CONFLICT,
      );
    }
    if (plan.isTrial) {
      const assignment = await this.plansRepository.assignTrialPlanOnce(
        userId,
        planId,
        assignedBy,
        new Date(),
      );
      if (assignment === null) {
        throw new BusinessException(
          'Plan trial already used',
          'PLAN_TRIAL_ALREADY_USED',
          HttpStatus.CONFLICT,
        );
      }
    } else {
      if (
        durationMonths === undefined ||
        !Number.isInteger(durationMonths) ||
        durationMonths < 1 ||
        durationMonths > PLAN_GRANT_MAX_DURATION_MONTHS
      ) {
        throw new BusinessException(
          `Grant duration must be a whole number of months between 1 and ${PLAN_GRANT_MAX_DURATION_MONTHS}`,
          PLAN_GRANT_DURATION_INVALID,
          HttpStatus.BAD_REQUEST,
        );
      }
      const trimmedReason = grantReason?.trim() ?? '';
      if (trimmedReason.length === 0) {
        throw new BusinessException(
          'A reason is required for an admin plan grant',
          PLAN_GRANT_REASON_REQUIRED,
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.plansRepository.assignUserToPlan(
        userId,
        planId,
        assignedBy,
        durationMonths,
        trimmedReason,
        new Date(),
      );
    }
    this.logger.log(`assignUserToPlan: user=${userId} plan=${planId}`);
    return this.toView(plan);
  }

  // Every row is checked against real connector inventory before anything is
  // written. Until this existed, provider and model were free strings on the
  // way in and nothing ever asked whether the pair named a model that had been
  // synced, was exposed, or was even a chat deployment — so a typo or a guess
  // became a durable entitlement that looked identical to a real one.
  //
  // All or nothing: one unknown pair rejects the whole request rather than
  // silently saving the rest, because a partially applied plan is harder to
  // notice than a refused one.
  async setModelAccess(id: string, dto: SetPlanModelAccessDto): Promise<PlanView> {
    await this.getPlan(id);
    if (dto.models.length > EXPOSED_MODEL_VALIDATION_MAX_PAIRS) {
      throw new BusinessException(
        `A plan cannot be given more than ${String(EXPOSED_MODEL_VALIDATION_MAX_PAIRS)} models in one request.`,
        'PLAN_MODEL_ACCESS_TOO_MANY',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.models.length > 0) {
      const requested = dto.models.map((row) => ({ provider: row.provider, model: row.model }));
      const exposed = await this.exposedModels.findExposed(requested);
      const allowed = new Set(exposed.map((pair) => `${pair.provider}/${pair.model}`));
      const rejected = requested.filter((pair) => !allowed.has(`${pair.provider}/${pair.model}`));
      if (rejected.length > 0) {
        const names = rejected.map((pair) => `${pair.provider}/${pair.model}`).join(', ');
        this.logger.warn(`setModelAccess: id=${id} rejected=${names}`);
        // A refused assignment is worth recording as well. Repeated attempts to
        // entitle a plan to models that do not exist is a signal, and it is
        // invisible if only successes are audited.
        this.structuredLogger.logAction({
          level: LogLevel.WARN,
          message: `Plan model access refused on plan ${id}`,
          action: 'plan_model_access_refused',
          service: PlansService.name,
          metadata: {
            planId: id,
            rejected: rejected.map((pair) => `${pair.provider}/${pair.model}`),
          },
        });
        throw new BusinessException(
          `These models are not available to assign: ${names}. A model must be synced from a connector and exposed before a plan can use it.`,
          'PLAN_MODEL_NOT_EXPOSED',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
    const plan = await this.plansRepository.replaceModelAccess(id, dto.models);
    // Which models a plan grants is an entitlement decision, so the change has
    // to be recoverable later — who changed it, on which plan, and to what. The
    // rows are recorded as provider/model keys rather than the full DTO: the
    // flags are visible on the plan, the identities are what an investigator
    // needs.
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Plan model access replaced on plan ${id}`,
      action: 'plan_model_access_replaced',
      service: PlansService.name,
      metadata: {
        planId: id,
        models: dto.models.map((row) => `${row.provider}/${row.model}`),
      },
    });
    this.logger.log(`setModelAccess: id=${id} rows=${dto.models.length}`);
    return this.toView(plan);
  }

  async listUsersOnPlan(id: string): Promise<{ userIds: string[] }> {
    await this.getPlan(id);
    return { userIds: await this.plansRepository.listUserIdsOnPlan(id) };
  }

  private toView(plan: PlanWithAccess): PlanView {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceMonthly: plan.priceMonthly === null ? null : Number(plan.priceMonthly),
      priceYearly: plan.priceYearly === null ? null : Number(plan.priceYearly),
      currency: plan.currency,
      displayOrder: plan.displayOrder,
      isDefault: plan.isDefault,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      isTrial: plan.isTrial,
      trialDurationDays: plan.trialDurationDays,
      lifecycleStatus: plan.lifecycleStatus,
      replacementPlanId: plan.replacementPlanId,
      retiredAt: plan.retiredAt,
      dailyTokenQuota: plan.dailyTokenQuota,
      weeklyTokenQuota: plan.weeklyTokenQuota,
      monthlyTokenQuota: plan.monthlyTokenQuota,
      maxChatsPerDay: plan.maxChatsPerDay,
      maxMessagesPerDay: plan.maxMessagesPerDay,
      maxWorkspaceConnections: plan.maxWorkspaceConnections,
      maxContextPacks: plan.maxContextPacks,
      maxMemoryItems: plan.maxMemoryItems,
      ...this.toFeatureGates(plan),
      modelAccessMode: plan.modelAccessMode,
      allowedCostClasses: plan.allowedCostClasses,
      modelAccess: plan.modelAccess.map((m) => this.toModelAccessView(m)),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private toFeatureGates(plan: PlanWithAccess): PlanFeatureGates {
    return {
      allowCompareMode: plan.allowCompareMode,
      allowJudgeMode: plan.allowJudgeMode,
      allowResearchMode: plan.allowResearchMode,
      allowCriticReview: plan.allowCriticReview,
      allowWorkspaces: plan.allowWorkspaces,
      allowMemory: plan.allowMemory,
      allowContextPacks: plan.allowContextPacks,
      allowConsensusMode: plan.allowConsensusMode,
      allowEscalationChain: plan.allowEscalationChain,
      allowRepairLab: plan.allowRepairLab,
      allowTaskDecomposer: plan.allowTaskDecomposer,
      allowBestOfN: plan.allowBestOfN,
      allowVerifier: plan.allowVerifier,
      allowPipelineLab: plan.allowPipelineLab,
      allowCostEnsemble: plan.allowCostEnsemble,
      allowRolePack: plan.allowRolePack,
    };
  }

  /**
   * Refuses a plan assignment aimed at the super administrator.
   *
   * Applies to the human-driven admin path only. System-driven writes — billing
   * entitlement events and plan retirement — deliberately bypass this, because a
   * legitimate event that cannot be applied poisons a consumer retry loop; see
   * EntitlementApplierService and PlansRepository.retire.
   */
  private async assertPlanAssignable(userId: string, actorId: string): Promise<void> {
    const target = await this.plansRepository.findUserMutabilityFacts(userId);
    if (!target) {
      throw new EntityNotFoundException('User', userId);
    }
    const outcome = resolveSuperAdminMutability({
      target,
      actorId,
      scope: SuperAdminMutationScope.PLAN,
    });
    if (outcome.allowed) return;

    const isOther = outcome.reason === 'IMMUTABLE_TO_OTHERS';
    this.structuredLogger.logAction({
      level: LogLevel.WARN,
      action: isOther ? SUPER_ADMIN_REFUSED_TARGET_ACTION : SUPER_ADMIN_REFUSED_SELF_ACTION,
      message: `Plan assignment refused for the super administrator (actor=${actorId})`,
      service: PlansService.name,
      metadata: { userId, actorId, scope: SuperAdminMutationScope.PLAN },
    });
    throw new BusinessException(
      isOther ? SUPER_ADMIN_IMMUTABLE_MESSAGE : SUPER_ADMIN_SELF_LOCKED_MESSAGE,
      isOther ? SUPER_ADMIN_IMMUTABLE_CODE : SUPER_ADMIN_SELF_LOCKED_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  private toModelAccessView(model: PlanWithAccess['modelAccess'][number]): PlanModelAccessView {
    return {
      provider: model.provider,
      model: model.model,
      isAllowed: model.isAllowed,
      allowAsPrimary: model.allowAsPrimary,
      allowAsFallback: model.allowAsFallback,
      allowAsJudge: model.allowAsJudge,
      allowInCompare: model.allowInCompare,
      dailyTokenLimitOverride: model.dailyTokenLimitOverride,
    };
  }
}
