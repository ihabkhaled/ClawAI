import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser, Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type SamlCallbackDto,
  samlCallbackSchema,
  type SetOrgSsoMetadataDto,
  setOrgSsoMetadataSchema,
} from '../dto/saml.dto';
import { SamlService } from '../services/saml.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/organizations/:slug/sso')
export class SamlController {
  constructor(private readonly service: SamlService) {}

  @Post('metadata')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setMetadata(
    @CurrentUser() _user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(setOrgSsoMetadataSchema)) dto: SetOrgSsoMetadataDto,
  ): Promise<void> {
    return this.service.setMetadata(slug, dto);
  }

  /**
   * SAML POST-binding callback. Public — the IdP signs the response and
   * the verifier checks the signature against the org's stored
   * `ssoMetadataJson.expectedIssuer`. The response payload is
   * intentionally minimal (just the validated nameId + attributes); a
   * production rollout layers this with session creation in
   * claw-auth-service.
   */
  @Post('callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  async callback(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(samlCallbackSchema)) dto: SamlCallbackDto,
  ): Promise<{ nameId: string; orgId: string; attributes: { name: string; values: string[] }[] }> {
    return this.service.handleCallback(slug, dto);
  }
}
