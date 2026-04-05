import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ServerLogsController } from "./controllers/server-logs.controller";
import { ServerLogsService } from "./services/server-logs.service";
import { ServerLogsRepository } from "./repositories/server-logs.repository";
import { ServerLogEventManager } from "./managers/server-log-event.manager";
import { ServerLog, ServerLogSchema } from "./schemas/server-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServerLog.name, schema: ServerLogSchema },
    ]),
  ],
  controllers: [ServerLogsController],
  providers: [
    ServerLogsService,
    ServerLogsRepository,
    ServerLogEventManager,
  ],
  exports: [ServerLogsService],
})
export class ServerLogsModule {}
