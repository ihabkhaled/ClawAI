import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import {
  ContextPackPortableService,
  type PackExportPayload,
  type PackImportResult,
} from '../services/context-pack-portable.service';

@Controller('context-packs')
export class ContextPackPortableController {
  constructor(private readonly service: ContextPackPortableService) {}

  @Get(':id/export')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="context-pack.json"')
  async exportOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PackExportPayload> {
    return this.service.exportPack(id, user.id);
  }

  @Post('import')
  async importPack(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PackExportPayload,
  ): Promise<PackImportResult> {
    return this.service.importPack(user.id, body);
  }
}
