import { Injectable } from "@nestjs/common";
import { RoutingPolicy } from "@prisma/client";
import { RoutingRepository } from "../repositories/routing.repository";
import { EntityNotFoundException } from "../../../common/errors";

@Injectable()
export class RoutingService {
  constructor(private readonly routingRepository: RoutingRepository) {}

  async findActivePolicies(): Promise<RoutingPolicy[]> {
    return this.routingRepository.findActivePolicies();
  }

  async findPolicyById(id: string): Promise<RoutingPolicy> {
    const policy = await this.routingRepository.findPolicyById(id);
    if (!policy) {
      throw new EntityNotFoundException("RoutingPolicy", id);
    }
    return policy;
  }
}
