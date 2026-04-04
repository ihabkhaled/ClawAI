import { Module } from "@nestjs/common";
import { RoutingController } from "./controllers/routing.controller";
import { RoutingService } from "./services/routing.service";
import { RoutingManager } from "./managers/routing.manager";
import { RoutingPoliciesRepository } from "./repositories/routing-policies.repository";
import { RoutingDecisionsRepository } from "./repositories/routing-decisions.repository";

@Module({
  controllers: [RoutingController],
  providers: [
    RoutingService,
    RoutingManager,
    RoutingPoliciesRepository,
    RoutingDecisionsRepository,
  ],
  exports: [RoutingService],
})
export class RoutingModule {}
