import { Global, Module } from "@nestjs/common";
import { AuditsController } from "./controllers/audits.controller";
import { AuditsService } from "./services/audits.service";
import { AuditsRepository } from "./repositories/audits.repository";

@Global()
@Module({
  controllers: [AuditsController],
  providers: [AuditsService, AuditsRepository],
  exports: [AuditsService],
})
export class AuditsModule {}
