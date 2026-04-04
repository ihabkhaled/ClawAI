import { Injectable } from "@nestjs/common";
import { Connector } from "@prisma/client";
import { ConnectorsRepository } from "../repositories/connectors.repository";
import { EntityNotFoundException } from "../../../common/errors";

@Injectable()
export class ConnectorsService {
  constructor(private readonly connectorsRepository: ConnectorsRepository) {}

  async findAll(): Promise<Connector[]> {
    return this.connectorsRepository.findAll();
  }

  async findById(id: string): Promise<Connector> {
    const connector = await this.connectorsRepository.findById(id);
    if (!connector) {
      throw new EntityNotFoundException("Connector", id);
    }
    return connector;
  }
}
