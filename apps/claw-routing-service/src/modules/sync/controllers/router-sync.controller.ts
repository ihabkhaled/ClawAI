import { Controller, Post } from '@nestjs/common';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { RouterSyncService } from '../services/router-sync.service';
import { type SyncRunResult } from '../types/sync.types';

@Controller('routing/models/sync')
export class RouterSyncController {
  constructor(private readonly service: RouterSyncService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async triggerSync(): Promise<SyncRunResult> {
    return this.service.triggerSync();
  }
}
