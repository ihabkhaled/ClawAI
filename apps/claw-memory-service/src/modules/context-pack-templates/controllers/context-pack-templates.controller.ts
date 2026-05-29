import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import type { ContextPack, ContextPackTemplate } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { ContextPackTemplateService } from '../services/context-pack-template.service';
import { type CloneTemplateDto, cloneTemplateSchema } from '../dto/clone-template.dto';

@Controller('context-pack-templates')
@RequirePermissions(Permission.CONTEXT_PACK_READ_OWN)
export class ContextPackTemplatesController {
  constructor(private readonly service: ContextPackTemplateService) {}

  @Get()
  async list(@Query('category') category: string | undefined): Promise<ContextPackTemplate[]> {
    return this.service.list(category);
  }

  @Post(':id/clone')
  async clone(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(cloneTemplateSchema)) dto: CloneTemplateDto,
  ): Promise<ContextPack> {
    return this.service.clone(id, user.id, dto);
  }
}
