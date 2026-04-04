import { Controller, Get, Param } from "@nestjs/common";
import { RoutingPolicy } from "../../../generated/prisma";
import { RoutingService } from "../services/routing.service";

@Controller("routing")
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Get("policies")
  async findActivePolicies(): Promise<RoutingPolicy[]> {
    return this.routingService.findActivePolicies();
  }

  @Get("policies/:id")
  async findPolicyById(@Param("id") id: string): Promise<RoutingPolicy> {
    return this.routingService.findPolicyById(id);
  }
}
