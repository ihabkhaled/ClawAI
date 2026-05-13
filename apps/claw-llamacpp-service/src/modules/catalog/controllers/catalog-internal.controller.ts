import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { RoutingSnapshotManager } from '../managers/routing-snapshot.manager';
import { type RoutingSnapshotResult } from '../types/catalog.types';

@Controller('internal/llamacpp')
export class CatalogInternalController {
  constructor(private readonly routingSnapshotManager: RoutingSnapshotManager) {}

  @Public()
  @Get('loaded-snapshot')
  async getLoadedSnapshot(): Promise<RoutingSnapshotResult> {
    return this.routingSnapshotManager.build();
  }
}
