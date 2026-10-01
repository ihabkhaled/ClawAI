import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { addCalendarMonths } from '@claw/shared-utilities';
import { PlansRepository } from '../repositories/plans.repository';
import { ExposedModelClient } from '../clients/exposed-model.client';
import { EXPOSED_MODEL_VALIDATION_MAX_PAIRS } from '../constants/exposed-model.constants';
import { PLAN_QUOTA_WINDOWS_INCOHERENT } from '../constants/quota-window.constants';
import {
  PLAN_GRANT_DURATION_INVALID,
  PLAN_GRANT_MAX_DURATION_DAYS,
  PLAN_GRANT_MAX_DURATION_MONTHS,
  PLAN_GRANT_REASON_REQUIRED,
} from '../constants/plan-grant.constants';
import {
  PLAN_TRIAL_LENGTH_MISSING,
  PLAN_TRIAL_NOT_FOUND,
  PLAN_TRIAL_SUPERSEDED,
} from '../constants/plan-trial.constants';
import { addTrialDays, resolveExtendedTrialEnd } from '../utilities/trial-expiry.utility';
import { resolveTrialDaysRemaining } from '../../admin-statistics/utilities/trial-days-remaining.utility';
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
  type AddTrialDaysResult,
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
    this.assertTrialLengthCoherent(dto, current);
    const plan = await this.plansRepository.update(id, dto);
    this.logger.log(`updatePlan: id=${id}`);
    return this.toView(plan);
  }

  /**
   * A trial plan must end up with a length and a non-trial plan must end up with
   * none. The DTO checks what was sent; this checks it against the stored row,
   * so changing only the length of a plan that is not a trial is refused instead
   * of tripping the database constraint as a 500.
   */
  private assertTrialLengthCoherent(dto: UpdatePlanDto, current: PlanView): void {
    if (dto.isTrial === undefined && dto.trialDurationDays === undefined) {
      return;
    }
    const isTrial = dto.isTrial ?? current.isTrial;
    const days =
      dto.trialDurationDays === undefined ? current.trialDurationDays : dto.trialDurationDays;
    if (isTrial && days === null) {
      throw new BusinessException(
        'A trial plan needs a trial length in days',
        PLAN_TRIAL_LENGTH_MISSING,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!isTrial && days !== null) {
      throw new BusinessException(
        'Only a trial plan has a trial length',
        PLAN_TRIAL_LENGTH_MISSING,
        HttpStatus.BAD_REQUEST,
      );
    }
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
    durationDays?: number,
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
    if (plan.isTrial && durationDays !== undefined) {
      await this.grantTrialPlanForDays(userId, plan, assignedBy, durationDays, grantReason);
      return this.toView(plan);
    }
    if (plan.isTrial) {
      const assignment = await this.plansRepository.assignTrialPlanOnce(
        userId,
        planId,
        assignedBy,
        new Date(),
      );
      if (assignment === null) {
        // The trial is spent. If this plan is also the DEFAULT one, that must
        // not block the assignment: putting someone back on the baseline plan
        // is a downgrade, not a trial grant.
        //
        // The default plan is flagged isTrial, so every downgrade to free ran
        // down this path, collided with the user's existing redemption row and
        // failed. Once a user had used their trial there was no way back to
        // free at all — the only way off a paid plan was another paid plan.
        //
        // The redemption row is left exactly as it is, so a spent trial stays
        // spent and this grants only the baseline they would have had anyway.
        // To give a spent-trial user more days, the admin passes durationDays.
        if (plan.isDefault) {
          await this.plansRepository.assignDefaultPlan(userId, planId);
          this.logger.log(
            `assignUserToPlan: user=${userId} downgraded to default plan=${planId} (trial already spent)`,
          );
          return this.toView(plan);
        }
        throw new BusinessException(
          'Plan trial already used',
          'PLAN_TRIAL_ALREADY_USED',
          HttpStatus.CONFLICT,
        );
      }
    } else {
      const now = new Date();
      await this.plansRepository.assignUserToPlan(
        userId,
        planId,
        assignedBy,
        this.resolveGrantValidUntil(durationMonths, durationDays, now),
        this.requireGrantReason(grantReason),
        now,
      );
    }
    this.logger.log(`assignUserToPlan: user=${userId} plan=${planId}`);
    return this.toView(plan);
  }

  /**
   * "Set to Free for N days": a reasoned admin grant of a trial plan.
   *
   * Unlike the one-time self-service trial, this works for a user whose lifetime
   * trial is already spent — the admin is explicitly reopening it. The
   * redemption row is re-pointed at the new assignment, so the trial reads as
   * ACTIVE until a different grant (e.g. Pro) replaces it, at which point the
   * panel reports SUPERSEDED and not "N days left".
   */
  private async grantTrialPlanForDays(
    userId: string,
    plan: PlanWithAccess,
    assignedBy: string,
    durationDays: number,
    grantReason: string | undefined,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = this.resolveGrantValidUntil(undefined, durationDays, now);
    const reason = this.requireGrantReason(grantReason);
    await this.plansRepository.assignAdminTrialGrant(
      userId,
      plan.id,
      assignedBy,
      expiresAt,
      reason,
      now,
    );
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Admin set user ${userId} to trial plan ${plan.slug} for ${durationDays} days`,
      action: 'plan_admin_trial_grant',
      service: PlansService.name,
      metadata: {
        userId,
        actorId: assignedBy,
        planId: plan.id,
        days: durationDays,
        expiresAt: expiresAt.toISOString(),
        reason,
      },
    });
    this.logger.log(`grantTrialPlanForDays: user=${userId} plan=${plan.id} days=${durationDays}`);
  }

  /**
   * Adds days to a user's free trial — still running or already lapsed.
   *
   * Refused when another grant has replaced the trial: extending a redemption
   * row that no longer grants anything would change a date nobody can see take
   * effect. That case is "Set to Free for N days".
   */
  async extendUserTrial(
    userId: string,
    assignedBy: string,
    days: number,
    reason: string,
  ): Promise<AddTrialDaysResult> {
    await this.assertPlanAssignable(userId, assignedBy);
    const [redemption, assignment] = await Promise.all([
      this.plansRepository.findTrialRedemption(userId),
      this.plansRepository.findLatestAssignmentForUser(userId),
    ]);
    if (redemption === null) {
      throw new BusinessException(
        'This user has never had a free trial',
        PLAN_TRIAL_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }
    if (assignment === null || assignment.id !== redemption.assignmentId) {
      throw new BusinessException(
        'This user is no longer on their free trial. Set them to the free plan for a number of days instead',
        PLAN_TRIAL_SUPERSEDED,
        HttpStatus.CONFLICT,
      );
    }
    const now = new Date();
    const expiresAt = resolveExtendedTrialEnd(redemption.expiresAt, now, days);
    await this.plansRepository.extendTrial(userId, assignment.id, assignment.planId, expiresAt);
    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: `Admin added ${days} trial days to user ${userId}`,
      action: 'plan_trial_days_added',
      service: PlansService.name,
      metadata: {
        userId,
        actorId: assignedBy,
        days,
        previousExpiresAt: redemption.expiresAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reason,
      },
    });
    this.logger.log(`extendUserTrial: user=${userId} days=${days}`);
    return {
      userId,
      expiresAt: expiresAt.toISOString(),
      daysRemaining: resolveTrialDaysRemaining(expiresAt, now),
    };
  }

  private requireGrantReason(grantReason: string | undefined): string {
    const trimmed = grantReason?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new BusinessException(
        'A reason is required for an admin plan grant',
        PLAN_GRANT_REASON_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    return trimmed;
  }

  /** Exactly one of months or days, each a whole number inside its ceiling. */
  private resolveGrantValidUntil(
    durationMonths: number | undefined,
    durationDays: number | undefined,
    now: Date,
  ): Date {
    if (durationDays !== undefined) {
      if (
        !Number.isInteger(durationDays) ||
        durationDays < 1 ||
        durationDays > PLAN_GRANT_MAX_DURATION_DAYS
      ) {
        throw new BusinessException(
          `Grant duration must be a whole number of days between 1 and ${PLAN_GRANT_MAX_DURATION_DAYS}`,
          PLAN_GRANT_DURATION_INVALID,
          HttpStatus.BAD_REQUEST,
        );
      }
      return addTrialDays(now, durationDays);
    }
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
    return new Date(addCalendarMonths(now.getTime(), durationMonths));
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
      maxVideoSeconds: plan.maxVideoSeconds,
      // Both of these are ADMIN-form fields. Omitting them from the view meant
      // the edit form loaded `undefined`, rendered blank in a number input, and
      // then failed to save with "expected number, received NaN" — so an
      // operator could never set either one, and any value already in the
      // database was invisible to the screen that edits it.
      // BIGINT in Postgres, so Prisma hands back a bigint. It crosses JSON as a
      // number because the ceiling is micro-USD and stays far inside the safe
      // integer range; serialising a bigint would throw at the controller.
      monthlyProviderCostCeilingMicroUsd:
        plan.monthlyProviderCostCeilingMicroUsd === null
          ? null
          : Number(plan.monthlyProviderCostCeilingMicroUsd),
      paygCreditPercentBps: plan.paygCreditPercentBps,
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
      allowImageGeneration: plan.allowImageGeneration,
      allowHelperVision: plan.allowHelperVision,
      allowTextToSpeech: plan.allowTextToSpeech,
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
