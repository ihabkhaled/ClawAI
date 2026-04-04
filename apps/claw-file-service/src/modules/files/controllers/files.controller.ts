import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { type File, type FileChunk } from "../../../generated/prisma";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser, type PaginatedResult } from "../../../common/types";
import { FilesService } from "../services/files.service";
import { type UploadFileDto, uploadFileSchema } from "../dto/upload-file.dto";
import { type ListFilesQueryDto, listFilesQuerySchema } from "../dto/list-files-query.dto";

@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(uploadFileSchema)) dto: UploadFileDto,
  ): Promise<File> {
    return this.filesService.uploadFile(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listFilesQuerySchema)) query: ListFilesQueryDto,
  ): Promise<PaginatedResult<File>> {
    return this.filesService.getFiles(user.id, query);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<File> {
    return this.filesService.getFile(id, user.id);
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<File> {
    return this.filesService.deleteFile(id, user.id);
  }

  @Get(":id/chunks")
  async getChunks(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FileChunk[]> {
    return this.filesService.getChunks(id, user.id);
  }
}
