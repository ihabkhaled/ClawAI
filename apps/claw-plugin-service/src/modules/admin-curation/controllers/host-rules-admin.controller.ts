import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AdminAuditRowView,
  type AdminRuleView,
  type AuthenticatedUser,
  Permission,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ADMIN_CACHE_CONTROL } from '../constants/curation.constants';
import {
  type AuditQuery,
  auditQuerySchema,
  type CreateRuleBody,
  createRuleBodySchema,
  ruleIdSchema,
} from '../dto/curation.dto';
import { AdminAuditService } from '../services/admin-audit.service';
import { HostRulesAdminService } from '../services/host-rules-admin.service';

/** Allow/deny rules and the admin audit log (PLUGINS_ADMIN). */
@RequirePermissions(Permission.PLUGINS_ADMIN)
@Controller('plugins/admin')
export class HostRulesAdminController {
  constructor(
    private readonly rules: HostRulesAdminService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('rules')
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  listRules(): Promise<AdminRuleView[]> {
    return this.rules.list();
  }

  @Post('rules')
  createRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRuleBodySchema)) body: CreateRuleBody,
  ): Promise<AdminRuleView> {
    return this.rules.create(user.id, body);
  }

  @Delete('rules/:id')
  @HttpCode(204)
  async removeRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(ruleIdSchema)) id: string,
  ): Promise<void> {
    await this.rules.remove(user.id, id);
  }

  @Get('audit')
  @Header('Cache-Control', ADMIN_CACHE_CONTROL)
  listAudit(
    @Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQuery,
  ): Promise<AdminAuditRowView[]> {
    return this.audit.list(query);
  }
}
