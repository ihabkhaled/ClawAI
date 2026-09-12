import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type AddMemberDto,
  addMemberSchema,
  type CreateOrganizationDto,
  createOrganizationSchema,
} from '../dto/organization.dto';
import {
  type UpdateOrganizationPolicyDto,
  updateOrganizationPolicySchema,
} from '../dto/organization-policy.dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationPolicyService } from '../services/organization-policy.service';
import {
  type Organization,
  type OrganizationMember,
  OrganizationRole,
} from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { DeviceMatrixRow } from '../types/device-matrix.types';
import type { EffectivePolicy } from '../types/organization-policy.types';

@Controller('agent/organizations')
export class FleetController {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly policies: OrganizationPolicyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrganizationSchema)) dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.repo.create({
      name: dto.name,
      slug: dto.slug,
      ssoEnabled: dto.ssoEnabled,
    });
    await this.repo.addMember({
      organization: { connect: { id: org.id } },
      userId: user.id,
      role: OrganizationRole.OWNER,
    });
    return org;
  }

  @Get()
  async listMine(@CurrentUser() user: AuthenticatedUser): Promise<Organization[]> {
    return this.repo.listOrganizationsForUser(user.id);
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string): Promise<OrganizationMember[]> {
    return this.repo.listMembers(id);
  }

  // V2 Stream 07 — device matrix for fleet governance.
  // Returns every device owned by a member of this organization,
  // including last-seen + pending capability count for triage.
  @Get(':id/devices')
  async listDevices(@Param('id') id: string): Promise<DeviceMatrixRow[]> {
    return this.repo.listDevicesForOrganization(id);
  }

  /**
   * The policy this client must obey, for the signed-in user.
   *
   * Deliberately not under `:id`: a client does not know which organizations
   * its user belongs to, and should not have to ask. The answer is the
   * intersection of all of them, so belonging to a permissive organization
   * cannot loosen a stricter one.
   */
  @Get('policy/effective')
  async effectivePolicy(@CurrentUser() user: AuthenticatedUser): Promise<EffectivePolicy> {
    return this.policies.effectiveForUser(user.id);
  }

  @Get(':id/policy')
  async organizationPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EffectivePolicy> {
    return this.policies.forOrganization(id, user.id);
  }

  @Put(':id/policy')
  async updatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrganizationPolicySchema)) dto: UpdateOrganizationPolicyDto,
  ): Promise<EffectivePolicy> {
    return this.policies.update(id, user.id, dto);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
  ): Promise<OrganizationMember> {
    return this.repo.addMember({
      organization: { connect: { id } },
      userId: dto.userId,
      role: dto.role,
    });
  }
}
