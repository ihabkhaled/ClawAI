import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { RoutingSnapshotManager } from '../managers/routing-snapshot.manager';
import { type RoutingSnapshotResult } from '../types/catalog.types';

// `@Public()` only skips the USER JWT guard — a service has no user token.
// `ServiceTokenGuard` is what actually authenticates every route here (ADR-144).
@Controller('internal/llamacpp')
@UseGuards(ServiceTokenGuard)
export class CatalogInternalController {
  constructor(private readonly routingSnapshotManager: RoutingSnapshotManager) {}

  @Public()
  @Get('loaded-snapshot')
  async getLoadedSnapshot(): Promise<RoutingSnapshotResult> {
    return this.routingSnapshotManager.build();
  }
}
