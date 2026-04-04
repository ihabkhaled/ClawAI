import { Controller, Get, Post, Delete, Param, Body, Query } from "@nestjs/common";
import { type File, type FileIngestionStatus } from "../../../generated/prisma";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../common/types";
import { FilesService } from "../services/files.service";
import { CreateFileInput, FileWithChunks } from "../types/files.types";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<CreateFileInput, "userId">,
  ): Promise<File> {
    return this.filesService.create({ ...body, userId: user.id });
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("ingestionStatus") ingestionStatus?: FileIngestionStatus,
  ): Promise<File[]> {
    return this.filesService.findMany({ userId: user.id, ingestionStatus });
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<FileWithChunks> {
    return this.filesService.findById(id);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<File> {
    return this.filesService.delete(id);
  }
}
