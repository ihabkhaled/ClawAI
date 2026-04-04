import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser, type PaginatedResult } from "../../../common/types";
import { ContextPacksService } from "../services/context-packs.service";
import { type CreateContextPackDto, createContextPackSchema } from "../dto/create-context-pack.dto";
import { type UpdateContextPackDto, updateContextPackSchema } from "../dto/update-context-pack.dto";
import { type AddContextPackItemDto, addContextPackItemSchema } from "../dto/add-context-pack-item.dto";
import { type ContextPackWithItems } from "../types/context-packs.types";

@Controller("context-packs")
export class ContextPacksController {
  constructor(private readonly contextPacksService: ContextPacksService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createContextPackSchema)) dto: CreateContextPackDto,
  ): Promise<ContextPack> {
    return this.contextPacksService.createContextPack(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ): Promise<PaginatedResult<ContextPack>> {
    return this.contextPacksService.getContextPacks(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPackWithItems> {
    return this.contextPacksService.getContextPack(id, user.id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateContextPackSchema)) dto: UpdateContextPackDto,
  ): Promise<ContextPack> {
    return this.contextPacksService.updateContextPack(id, user.id, dto);
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPack> {
    return this.contextPacksService.deleteContextPack(id, user.id);
  }

  @Post(":id/items")
  async addItem(
    @Param("id") contextPackId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(addContextPackItemSchema)) dto: AddContextPackItemDto,
  ): Promise<ContextPackItem> {
    return this.contextPacksService.addItem(contextPackId, user.id, dto);
  }

  @Delete(":id/items/:itemId")
  async removeItem(
    @Param("id") contextPackId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContextPackItem> {
    return this.contextPacksService.removeItem(contextPackId, itemId, user.id);
  }
}
