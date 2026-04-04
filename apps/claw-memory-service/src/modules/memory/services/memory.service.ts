import { Injectable } from "@nestjs/common";
import { type MemoryRecord } from "../../../generated/prisma";
import { EntityNotFoundException } from "../../../common/errors";
import { MemoryRepository } from "../repositories/memory.repository";
import { CreateMemoryRecordInput, MemoryRecordFilters, UpdateMemoryRecordInput } from "../types/memory.types";

@Injectable()
export class MemoryService {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async create(input: CreateMemoryRecordInput): Promise<MemoryRecord> {
    return this.memoryRepository.create(input);
  }

  async findById(id: string): Promise<MemoryRecord> {
    const record = await this.memoryRepository.findById(id);
    if (!record) {
      throw new EntityNotFoundException("MemoryRecord", id);
    }
    return record;
  }

  async findMany(filters: MemoryRecordFilters): Promise<MemoryRecord[]> {
    return this.memoryRepository.findMany(filters);
  }

  async update(id: string, input: UpdateMemoryRecordInput): Promise<MemoryRecord> {
    await this.findById(id);
    return this.memoryRepository.update(id, input);
  }

  async delete(id: string): Promise<MemoryRecord> {
    await this.findById(id);
    return this.memoryRepository.delete(id);
  }
}
