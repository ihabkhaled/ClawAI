import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ConnectorAccessService } from '../services/connector-access.service';
import {
  type GrantConnectorAccessDto,
  grantConnectorAccessSchema,
} from '../dto/grant.dto';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { WorkspaceConnectorGrant } from '../../../generated/prisma';

@Controller('workspace/connectors/:connectorId/grants')
export class ConnectorGrantController {
  constructor(private readonly access: ConnectorAccessService) {}

  // 3-line controller methods. All exception conversion lives in the
  // service layer — ConnectorAccessService throws ForbiddenException
  // when the caller lacks the required scope, and GlobalExceptionFilter
  // translates it to a 403.
  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectorId') connectorId: string,
  ): Promise<WorkspaceConnectorGrant[]> {
    return this.access.listGrantsAsViewer(user.id, connectorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async grant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectorId') connectorId: string,
    @Body(new ZodValidationPipe(grantConnectorAccessSchema)) dto: GrantConnectorAccessDto,
  ): Promise<WorkspaceConnectorGrant> {
    return this.access.grant(connectorId, dto.granteeUserId, user.id, dto.accessLevel);
  }

  @Delete(':granteeUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectorId') connectorId: string,
    @Param('granteeUserId') granteeUserId: string,
  ): Promise<void> {
    await this.access.revoke(connectorId, granteeUserId, user.id);
  }
}
