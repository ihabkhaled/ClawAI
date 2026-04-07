import { Module } from "@nestjs/common";
import { RoutingController } from "./controllers/routing.controller";
import { RoutingService } from "./services/routing.service";
import { RoutingManager } from "./managers/routing.manager";
import { OllamaRouterManager } from "./managers/ollama-router.manager";
import { RoutingPoliciesRepository } from "./repositories/routing-policies.repository";
import { RoutingDecisionsRepository } from "./repositories/routing-decisions.repository";

@Module({
  controllers: [RoutingController],
  providers: [
    RoutingService,
    RoutingManager,
    OllamaRouterManager,
    RoutingPoliciesRepository,
    RoutingDecisionsRepository,
  ],
  exports: [RoutingService],
})
export class RoutingModule {}
