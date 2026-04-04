import { Injectable } from "@nestjs/common";
import { type File } from "../../../generated/prisma";
import { EntityNotFoundException } from "../../../common/errors";
import { FilesRepository } from "../repositories/files.repository";
import { CreateFileInput, FileFilters, FileWithChunks, UpdateFileIngestionInput } from "../types/files.types";

@Injectable()
export class FilesService {
  constructor(private readonly filesRepository: FilesRepository) {}

  async create(input: CreateFileInput): Promise<File> {
    return this.filesRepository.create(input);
  }

  async findById(id: string): Promise<FileWithChunks> {
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new EntityNotFoundException("File", id);
    }
    return file;
  }

  async findMany(filters: FileFilters): Promise<File[]> {
    return this.filesRepository.findMany(filters);
  }

  async updateIngestion(id: string, input: UpdateFileIngestionInput): Promise<File> {
    await this.findById(id);
    return this.filesRepository.updateIngestion(id, input);
  }

  async delete(id: string): Promise<File> {
    await this.findById(id);
    return this.filesRepository.delete(id);
  }
}
