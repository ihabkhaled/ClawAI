import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { PlansRepository } from '../repositories/plans.repository';
import { ExposedModelClient } from '../clients/exposed-model.client';
import { EXPOSED_MODEL_VALIDATION_MAX_PAIRS } from '../constants/exposed-model.constants';
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

  async createPlan(dto: CreatePlanDto): Promise<PlanView> {
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
    await this.getPlan(id);
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

  async reorder(orderedIds: string[]): Promise<PlanView[]> {
    await this.plansRepository.reorder(orderedIds);
    return this.listPlans();
  }

  async assignUserToPlan(userId: string, planId: string, assignedBy: string): Promise<PlanView> {
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
      await this.plansRepository.assignUserToPlan(userId, planId, assignedBy);
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
