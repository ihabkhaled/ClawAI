import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ConnectorAccessService } from '../services/connector-access.service';
import type { SharedConnectorView } from '../types/connector-access.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

// Phase 12 — a separate, literal-path controller (rather than a method on
// ConnectorGrantController) because that controller's base path already
// carries a :connectorId param segment; "shared with me" spans every
// connector the caller has been granted, not one specific connector.
@Controller('workspace/connectors/shared-with-me')
export class ConnectorGrantInboxController {
  constructor(private readonly access: ConnectorAccessService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: AuthenticatedUser): Promise<SharedConnectorView[]> {
    return this.access.listSharedWithMe(user.id);
  }
}
