import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../common/types";
import { ContextPacksService } from "../services/context-packs.service";
import {
  CreateContextPackInput,
  CreateContextPackItemInput,
  ContextPackWithItems,
  UpdateContextPackInput,
  UpdateContextPackItemInput,
} from "../types/context-packs.types";

@Controller("context-packs")
export class ContextPacksController {
  constructor(private readonly contextPacksService: ContextPacksService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<CreateContextPackInput, "userId">,
  ): Promise<ContextPack> {
    return this.contextPacksService.create({ ...body, userId: user.id });
  }

  @Get()
  async findByUser(@CurrentUser() user: AuthenticatedUser): Promise<ContextPack[]> {
    return this.contextPacksService.findByUserId(user.id);
  }

  @Get(":id")
  async findById(@Param("id") id: string): Promise<ContextPackWithItems> {
    return this.contextPacksService.findById(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateContextPackInput,
  ): Promise<ContextPack> {
    return this.contextPacksService.update(id, body);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<ContextPack> {
    return this.contextPacksService.delete(id);
  }

  @Post(":id/items")
  async createItem(
    @Param("id") contextPackId: string,
    @Body() body: Omit<CreateContextPackItemInput, "contextPackId">,
  ): Promise<ContextPackItem> {
    return this.contextPacksService.createItem({ ...body, contextPackId });
  }

  @Put(":id/items/:itemId")
  async updateItem(
    @Param("itemId") itemId: string,
    @Body() body: UpdateContextPackItemInput,
  ): Promise<ContextPackItem> {
    return this.contextPacksService.updateItem(itemId, body);
  }

  @Delete(":id/items/:itemId")
  async deleteItem(@Param("itemId") itemId: string): Promise<ContextPackItem> {
    return this.contextPacksService.deleteItem(itemId);
  }
}
