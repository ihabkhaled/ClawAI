import { Controller, Get } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { GatewayConfigService } from '../services/gateway-config.service';
import type { CheckoutGatewayView } from '../types/gateway-config.types';

@Controller('billing/gateways')
export class CheckoutGatewaysController {
  constructor(private readonly gatewayConfig: GatewayConfigService) {}

  @Get()
  @Public()
  list(): Promise<CheckoutGatewayView[]> {
    return this.gatewayConfig.listCheckout();
  }
}
