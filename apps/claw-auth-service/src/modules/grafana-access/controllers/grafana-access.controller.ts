import { Controller, Get, Headers, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Permission } from '@claw/shared-types';
import type { Response } from 'express';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Public } from '../../../app/decorators/public.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import type { AuthenticatedUser } from '../../../common/types';
import {
  GRAFANA_ACCESS_COOKIE_NAME,
  GRAFANA_USER_HEADER,
} from '../constants/grafana-access.constants';
import { GrafanaAccessService } from '../services/grafana-access.service';
import type { GrafanaAccessGrantView } from '../types/grafana-access.types';
import { grafanaAccessCookieOptions } from '../utilities/grafana-access-cookie.utility';

/**
 * Grafana behind the admin session (ADR-115).
 *
 * `POST` is an ordinary authenticated API call from the admin UI: the shared
 * guard stack (AuthGuard → SessionRevocationGuard → RolesGuard) decides who
 * may have the cookie. `GET verify` is what nginx's `auth_request` asks on
 * every request to /grafana/; it is `@Public` because the caller is nginx
 * carrying the browser's cookie, not a Bearer token, and it checks the cookie
 * itself. nginx refuses the route from outside, so only the subrequest reaches it.
 */
@Controller('auth/grafana-access')
export class GrafanaAccessController {
  constructor(private readonly grafanaAccess: GrafanaAccessService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  grant(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): GrafanaAccessGrantView {
    const grant = this.grafanaAccess.grant(user);
    response.cookie(
      GRAFANA_ACCESS_COOKIE_NAME,
      grant.token,
      grafanaAccessCookieOptions(grant.maxAgeSeconds),
    );
    return { expiresAt: grant.expiresAt };
  }

  // Every Grafana request (page, asset, panel query) is one call here, all
  // from nginx's single address — the per-IP throttle would fall on the
  // whole admin team at once.
  @Get('verify')
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const identity = await this.grafanaAccess.verify(cookieHeader);
    response.setHeader(GRAFANA_USER_HEADER, identity.email);
  }
}
