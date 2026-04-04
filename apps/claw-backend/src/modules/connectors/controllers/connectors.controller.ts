import { Controller, Get, Param } from "@nestjs/common";
import { Connector } from "@prisma/client";
import { ConnectorsService } from "../services/connectors.service";

@Controller("connectors")
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get()
  async findAll(): Promise<Connector[]> {
    return this.connectorsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Connector> {
    return this.connectorsService.findById(id);
  }
}
