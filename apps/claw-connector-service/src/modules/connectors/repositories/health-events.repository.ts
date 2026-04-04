import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ConnectorHealthEvent, type ConnectorStatus } from "../../../generated/prisma";

export interface CreateHealthEventData {
  connectorId: string;
  status: ConnectorStatus;
  latencyMs?: number;
  errorMessage?: string;
}

@Injectable()
export class HealthEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHealthEventData): Promise<ConnectorHealthEvent> {
    return this.prisma.connectorHealthEvent.create({ data });
  }

  async findByConnectorId(
    connectorId: string,
    limit: number,
  ): Promise<ConnectorHealthEvent[]> {
    return this.prisma.connectorHealthEvent.findMany({
      where: { connectorId },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });
  }
}
