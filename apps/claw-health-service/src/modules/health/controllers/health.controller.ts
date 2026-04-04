import { Controller, Get } from "@nestjs/common";
import { HealthService } from "../services/health.service";
import { AggregatedHealth } from "../types/health.types";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<AggregatedHealth> {
    return this.healthService.checkAll();
  }
}
