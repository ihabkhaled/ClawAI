import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { type ImportResult, MemoryPortableService } from '../services/memory-portable.service';

@Controller('memories-portable')
@RequirePermissions(Permission.MEMORY_USE)
export class MemoryPortableController {
  constructor(private readonly service: MemoryPortableService) {}

  @Get('export')
  @Header('Content-Type', 'application/x-ndjson')
  @Header('Content-Disposition', 'attachment; filename="memories.ndjson"')
  async exportMine(@CurrentUser() user: AuthenticatedUser): Promise<string> {
    return this.service.exportNdjson(user.id);
  }

  @Post('import')
  async importMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { ndjson: string },
  ): Promise<ImportResult> {
    return this.service.importNdjson(user.id, body.ndjson ?? '');
  }
}
