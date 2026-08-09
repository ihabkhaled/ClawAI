import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type GatewayParamDto,
  gatewayParamSchema,
  type UpdateGatewayConfigurationDto,
  updateGatewayConfigurationSchema,
} from '../dto/gateway-config.dto';
import { GatewayConfigService } from '../services/gateway-config.service';
import type { GatewayAdminView } from '../types/gateway-config.types';

@Controller('admin/payment-gateways')
@RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
export class AdminGatewayConfigController {
  constructor(private readonly gatewayConfig: GatewayConfigService) {}

  @Get()
  list(): Promise<GatewayAdminView[]> {
    return this.gatewayConfig.listAdmin();
  }

  @Put(':gateway')
  update(
    @Param(new ZodValidationPipe(gatewayParamSchema)) params: GatewayParamDto,
    @Body(new ZodValidationPipe(updateGatewayConfigurationSchema))
    input: UpdateGatewayConfigurationDto,
  ): Promise<GatewayAdminView> {
    return this.gatewayConfig.update(params.gateway, input);
  }
}
