import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { RoutingPolicy } from "../../../generated/prisma";

@Injectable()
export class RoutingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePolicies(): Promise<RoutingPolicy[]> {
    return this.prisma.routingPolicy.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
  }

  async findPolicyById(id: string): Promise<RoutingPolicy | null> {
    return this.prisma.routingPolicy.findUnique({ where: { id } });
  }
}
