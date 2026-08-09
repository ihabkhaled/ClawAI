import { Module } from '@nestjs/common';

import { AdminGatewayConfigController } from './controllers/admin-gateway-config.controller';
import { CheckoutGatewaysController } from './controllers/checkout-gateways.controller';
import { GatewayConfigRepository } from './repositories/gateway-config.repository';
import { GatewayConfigService } from './services/gateway-config.service';
import { GatewayConfigBootstrapService } from './services/gateway-config-bootstrap.service';
import { GatewayRuntimeConfigService } from './services/gateway-runtime-config.service';

@Module({
  controllers: [AdminGatewayConfigController, CheckoutGatewaysController],
  providers: [
    GatewayConfigRepository,
    GatewayConfigService,
    GatewayConfigBootstrapService,
    GatewayRuntimeConfigService,
  ],
  exports: [GatewayConfigService, GatewayRuntimeConfigService],
})
export class GatewayConfigModule {}
