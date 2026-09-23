import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard, Roles, RolesGuard, SessionRevocationGuard } from '@claw/shared-auth';
import { UserRole } from '@claw/shared-types';

import {
  STATUS_CACHE_CONTROL,
  STATUS_THROTTLE_LIMIT,
  STATUS_THROTTLE_TTL_MS,
} from '../constants/status-page.constants';
import { StatusPageService } from '../services/status-page.service';
import { type StatusPageResponse } from '../types/status-page.types';

/**
 * The status page's data (observability plan B3). Admin-only, like the
 * `/observability` page that shows it (plan §2: "Admin only").
 *
 * Served under `/api/v1/health/status`, which nginx's existing
 * `location /api/v1/health` prefix already proxies here. The public
 * `/api/v1/health` stays as it is; this route is the one that is guarded.
 */
@Controller('health/status')
@UseGuards(AuthGuard, SessionRevocationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class StatusPageController {
  constructor(private readonly statusPageService: StatusPageService) {}

  @Get()
  @Throttle({ default: { limit: STATUS_THROTTLE_LIMIT, ttl: STATUS_THROTTLE_TTL_MS } })
  @Header('Cache-Control', STATUS_CACHE_CONTROL)
  async status(): Promise<StatusPageResponse> {
    return this.statusPageService.getStatus();
  }
}
