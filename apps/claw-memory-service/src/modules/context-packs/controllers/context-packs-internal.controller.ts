import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { type ContextPackWithItems } from "../types/context-packs.types";
import { ContextPacksService } from "../services/context-packs.service";

@Controller("internal/context-packs")
export class ContextPacksInternalController {
  constructor(private readonly contextPacksService: ContextPacksService) {}

  @Public()
  @Get(":id/items")
  async getItems(@Param("id") id: string): Promise<ContextPackWithItems | null> {
    return this.contextPacksService.getContextPackItemsInternal(id);
  }
}
