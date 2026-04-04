import { Injectable } from "@nestjs/common";
import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";
import { EntityNotFoundException } from "../../../common/errors";
import { ContextPacksRepository } from "../repositories/context-packs.repository";
import {
  CreateContextPackInput,
  CreateContextPackItemInput,
  ContextPackWithItems,
  UpdateContextPackInput,
  UpdateContextPackItemInput,
} from "../types/context-packs.types";

@Injectable()
export class ContextPacksService {
  constructor(private readonly contextPacksRepository: ContextPacksRepository) {}

  async create(input: CreateContextPackInput): Promise<ContextPack> {
    return this.contextPacksRepository.create(input);
  }

  async findById(id: string): Promise<ContextPackWithItems> {
    const pack = await this.contextPacksRepository.findById(id);
    if (!pack) {
      throw new EntityNotFoundException("ContextPack", id);
    }
    return pack;
  }

  async findByUserId(userId: string): Promise<ContextPack[]> {
    return this.contextPacksRepository.findByUserId(userId);
  }

  async update(id: string, input: UpdateContextPackInput): Promise<ContextPack> {
    await this.findById(id);
    return this.contextPacksRepository.update(id, input);
  }

  async delete(id: string): Promise<ContextPack> {
    await this.findById(id);
    return this.contextPacksRepository.delete(id);
  }

  async createItem(input: CreateContextPackItemInput): Promise<ContextPackItem> {
    await this.findById(input.contextPackId);
    return this.contextPacksRepository.createItem(input);
  }

  async updateItem(id: string, input: UpdateContextPackItemInput): Promise<ContextPackItem> {
    return this.contextPacksRepository.updateItem(id, input);
  }

  async deleteItem(id: string): Promise<ContextPackItem> {
    return this.contextPacksRepository.deleteItem(id);
  }
}
