import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { Roles } from '../../../app/decorators/roles.decorator';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import { PlansService } from '../services/plans.service';
import { CreatePlanDto, createPlanSchema } from '../dto/create-plan.dto';
import { UpdatePlanDto, updatePlanSchema } from '../dto/update-plan.dto';
import {
  AssignPlanDto,
  assignPlanSchema,
  ReorderPlansDto,
  reorderPlansSchema,
  SetPlanModelAccessDto,
  setPlanModelAccessSchema,
} from '../dto/plan-misc.dto';
import { type PlanView } from '../types/plans.types';

@Controller('admin/plans')
@Roles(UserRole.ADMIN)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async list(): Promise<PlanView[]> {
    return this.plansService.listPlans();
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<PlanView> {
    return this.plansService.getPlan(id);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createPlanSchema)) dto: CreatePlanDto,
  ): Promise<PlanView> {
    return this.plansService.createPlan(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) dto: UpdatePlanDto,
  ): Promise<PlanView> {
    return this.plansService.updatePlan(id, dto);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string): Promise<PlanView> {
    return this.plansService.activatePlan(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<PlanView> {
    return this.plansService.deactivatePlan(id);
  }

  @Post(':id/set-default')
  async setDefault(@Param('id') id: string): Promise<PlanView> {
    return this.plansService.setDefault(id);
  }

  @Post('reorder')
  async reorder(
    @Body(new ZodValidationPipe(reorderPlansSchema)) dto: ReorderPlansDto,
  ): Promise<PlanView[]> {
    return this.plansService.reorder(dto.orderedIds);
  }

  @Put(':id/model-access')
  async setModelAccess(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setPlanModelAccessSchema)) dto: SetPlanModelAccessDto,
  ): Promise<PlanView> {
    return this.plansService.setModelAccess(id, dto);
  }

  @Get(':id/users')
  async usersOnPlan(@Param('id') id: string): Promise<{ userIds: string[] }> {
    return this.plansService.listUsersOnPlan(id);
  }

  @Post('users/:userId/assign')
  async assignUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(assignPlanSchema)) dto: AssignPlanDto,
  ): Promise<PlanView> {
    return this.plansService.assignUserToPlan(userId, dto.planId, admin.id);
  }
}
