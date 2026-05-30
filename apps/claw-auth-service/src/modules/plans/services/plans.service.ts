import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { PlansRepository } from '../repositories/plans.repository';
import { type CreatePlanDto } from '../dto/create-plan.dto';
import { type UpdatePlanDto } from '../dto/update-plan.dto';
import { type SetPlanModelAccessDto } from '../dto/plan-misc.dto';
import { type PlanView, type PlanWithAccess } from '../types/plans.types';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly plansRepository: PlansRepository) {}

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
    await this.getPlan(id);
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
    await this.plansRepository.assignUserToPlan(userId, planId, assignedBy);
    this.logger.log(`assignUserToPlan: user=${userId} plan=${planId}`);
    return this.toView(plan);
  }

  async setModelAccess(id: string, dto: SetPlanModelAccessDto): Promise<PlanView> {
    await this.getPlan(id);
    const plan = await this.plansRepository.replaceModelAccess(id, dto.models);
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
      dailyTokenQuota: plan.dailyTokenQuota,
      monthlyTokenQuota: plan.monthlyTokenQuota,
      maxChatsPerDay: plan.maxChatsPerDay,
      maxMessagesPerDay: plan.maxMessagesPerDay,
      maxWorkspaceConnections: plan.maxWorkspaceConnections,
      maxContextPacks: plan.maxContextPacks,
      maxMemoryItems: plan.maxMemoryItems,
      allowCompareMode: plan.allowCompareMode,
      allowJudgeMode: plan.allowJudgeMode,
      allowResearchMode: plan.allowResearchMode,
      allowWorkspaces: plan.allowWorkspaces,
      allowMemory: plan.allowMemory,
      allowContextPacks: plan.allowContextPacks,
      modelAccess: plan.modelAccess.map((m) => ({
        provider: m.provider,
        model: m.model,
        isAllowed: m.isAllowed,
        allowAsPrimary: m.allowAsPrimary,
        allowAsFallback: m.allowAsFallback,
        allowAsJudge: m.allowAsJudge,
        allowInCompare: m.allowInCompare,
        dailyTokenLimitOverride: m.dailyTokenLimitOverride,
      })),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
