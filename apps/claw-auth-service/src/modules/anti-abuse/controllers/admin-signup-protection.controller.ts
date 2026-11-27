import { Controller, Get, Query } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type EmailCheckQueryDto, emailCheckQuerySchema } from '../dto/anti-abuse.dto';
import { EmailDomainPolicyService } from '../services/email-domain-policy.service';
import { SecuritySettingsService } from '../services/security-settings.service';
import type {
  EmailDomainExplanation,
  SignupProtectionStatus,
} from '../types/signup-protection.types';

/**
 * Read-only companions of the Sign-up protection page (2026-11-27): what is really in force (captcha keys
 * from a saved setting OR the server environment, the built-in list size) and what a sign-up with a given
 * address would get. ADMIN role + ADMIN_SYSTEM_VIEW, the page's own permission. Under the already-proxied
 * `/api/v1/admin` prefix, so no nginx change. Never returns a secret.
 */
@Controller('admin/security/sign-up')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
export class AdminSignupProtectionController {
  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly emailDomains: EmailDomainPolicyService,
  ) {}

  @Get('status')
  async status(): Promise<SignupProtectionStatus> {
    return this.settings.status();
  }

  @Get('email-check')
  async emailCheck(
    @Query(new ZodValidationPipe(emailCheckQuerySchema)) query: EmailCheckQueryDto,
  ): Promise<EmailDomainExplanation> {
    return this.emailDomains.explain(query.value);
  }
}
