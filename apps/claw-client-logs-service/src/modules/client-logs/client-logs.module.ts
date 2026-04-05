import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ClientLogsController } from "./controllers/client-logs.controller";
import { ClientLogsService } from "./services/client-logs.service";
import { ClientLogsRepository } from "./repositories/client-logs.repository";
import { ClientLog, ClientLogSchema } from "./schemas/client-log.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientLog.name, schema: ClientLogSchema },
    ]),
  ],
  controllers: [ClientLogsController],
  providers: [ClientLogsService, ClientLogsRepository],
  exports: [ClientLogsService],
})
export class ClientLogsModule {}
