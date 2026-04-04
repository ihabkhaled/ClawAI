import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { Connector } from "../../../generated/prisma";

@Injectable()
export class ConnectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Connector[]> {
    return this.prisma.connector.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Connector | null> {
    return this.prisma.connector.findUnique({ where: { id } });
  }
}
