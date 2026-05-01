import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type AddMemberDto,
  addMemberSchema,
  type CreateOrganizationDto,
  createOrganizationSchema,
} from '../dto/organization.dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationRole, type Organization, type OrganizationMember } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/organizations')
export class FleetController {
  constructor(private readonly repo: OrganizationRepository) {}

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
