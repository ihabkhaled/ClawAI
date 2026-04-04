import { Module } from "@nestjs/common";
import { ConnectorsController } from "./controllers/connectors.controller";
import { ConnectorsService } from "./services/connectors.service";
import { ConnectorsRepository } from "./repositories/connectors.repository";

@Module({
  controllers: [ConnectorsController],
  providers: [ConnectorsService, ConnectorsRepository],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
