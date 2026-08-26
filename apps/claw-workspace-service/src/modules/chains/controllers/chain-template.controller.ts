import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import {
  type InstantiateChainTemplateDto,
  instantiateChainTemplateSchema,
} from '../dto/chain-template.dto';
import { ChainTemplateService } from '../services/chain-template.service';
import type { WorkspaceChain, WorkspaceChainTemplate } from '../../../generated/prisma';

@Controller('workspace/chain-templates')
export class ChainTemplateController {
  constructor(private readonly service: ChainTemplateService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(): Promise<WorkspaceChainTemplate[]> {
    return this.service.list();
  }

  // Resolves the template's provider placeholders to the caller's own
  // connectors and creates a real, ordinary WorkspaceChain from it — see
  // ChainTemplateService.instantiate. The created chain still needs its
  // payload fields (project keys, channel ids, summaries, etc. — left
  // blank in the template) filled in via PATCH before it's ready to run.
  @Post(':key/instantiate')
  @HttpCode(HttpStatus.CREATED)
  async instantiate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body(new ZodValidationPipe(instantiateChainTemplateSchema)) dto: InstantiateChainTemplateDto,
  ): Promise<WorkspaceChain> {
    return this.service.instantiate(user.id, key, dto);
  }
}
