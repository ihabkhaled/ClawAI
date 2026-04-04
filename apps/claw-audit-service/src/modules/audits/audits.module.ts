import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditsController } from "./controllers/audits.controller";
import { AuditsService } from "./services/audits.service";
import { AuditsRepository } from "./repositories/audits.repository";
import { AuditLog, AuditLogSchema } from "./schemas/audit-log.schema";
import { UsageLedger, UsageLedgerSchema } from "./schemas/usage-ledger.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: UsageLedger.name, schema: UsageLedgerSchema },
    ]),
  ],
  controllers: [AuditsController],
  providers: [AuditsService, AuditsRepository],
  exports: [AuditsService],
})
export class AuditsModule {}
