import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { ConnectorsService } from "../services/connectors.service";
import { type ConnectorConfigResult } from "../types/connectors.types";

@Controller("internal/connectors")
export class ConnectorsInternalController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Public()
  @Get("config")
  async getConfig(
    @Query("provider") provider: string,
  ): Promise<ConnectorConfigResult> {
    return this.connectorsService.getConnectorConfig(provider);
  }
}
