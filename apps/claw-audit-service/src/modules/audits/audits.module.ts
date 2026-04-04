import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditsController } from "./controllers/audits.controller";
import { AuditsService } from "./services/audits.service";
import { UsageService } from "./services/usage.service";
import { AuditsRepository } from "./repositories/audits.repository";
import { UsageLedgerRepository } from "./repositories/usage-ledger.repository";
import { AuditEventManager } from "./managers/audit-event.manager";
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
  providers: [
    AuditsService,
    UsageService,
    AuditsRepository,
    UsageLedgerRepository,
    AuditEventManager,
  ],
  exports: [AuditsService, UsageService],
})
export class AuditsModule {}
