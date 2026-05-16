import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateEmailTemplateDto,
  createEmailTemplateSchema,
  type UpdateEmailTemplateDto,
  updateEmailTemplateSchema,
} from '../dto/email-template.dto';
import { EmailTemplateService } from '../services/email-template.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { UserEmailTemplate } from '../../../generated/prisma';

@Controller('workspace/email-templates')
export class EmailTemplateController {
  constructor(private readonly service: EmailTemplateService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<UserEmailTemplate[]> {
    return this.service.list(user.id);
  }

  @Get('default')
  @HttpCode(HttpStatus.OK)
  async getDefault(@CurrentUser() user: AuthenticatedUser): Promise<UserEmailTemplate | null> {
    return this.service.getDefault(user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<UserEmailTemplate> {
    return this.service.getOwn(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createEmailTemplateSchema)) dto: CreateEmailTemplateDto,
  ): Promise<UserEmailTemplate> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEmailTemplateSchema)) dto: UpdateEmailTemplateDto,
  ): Promise<UserEmailTemplate> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.service.deleteById(user.id, id);
  }
}
