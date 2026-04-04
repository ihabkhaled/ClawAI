import { Module } from "@nestjs/common";
import { RoutingController } from "./controllers/routing.controller";
import { RoutingService } from "./services/routing.service";
import { RoutingRepository } from "./repositories/routing.repository";

@Module({
  controllers: [RoutingController],
  providers: [RoutingService, RoutingRepository],
  exports: [RoutingService],
})
export class RoutingModule {}
