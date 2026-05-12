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
  type CreateEmailSignatureDto,
  createEmailSignatureSchema,
  type UpdateEmailSignatureDto,
  updateEmailSignatureSchema,
} from '../dto/email-signature.dto';
import { EmailSignatureService } from '../services/email-signature.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { UserEmailSignature } from '../../../generated/prisma';

@Controller('workspace/email-signatures')
export class EmailSignatureController {
  constructor(private readonly service: EmailSignatureService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<UserEmailSignature[]> {
    return this.service.list(user.id);
  }

  @Get('default')
  @HttpCode(HttpStatus.OK)
  async getDefault(@CurrentUser() user: AuthenticatedUser): Promise<UserEmailSignature | null> {
    return this.service.getDefault(user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<UserEmailSignature> {
    return this.service.getOwn(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createEmailSignatureSchema)) dto: CreateEmailSignatureDto,
  ): Promise<UserEmailSignature> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEmailSignatureSchema)) dto: UpdateEmailSignatureDto,
  ): Promise<UserEmailSignature> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.service.deleteById(user.id, id);
  }
}
