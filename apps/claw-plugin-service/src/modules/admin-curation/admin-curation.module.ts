import { Module } from '@nestjs/common';

import { HostRulesModule } from '../host-rules/host-rules.module';
import { McpServersModule } from '../mcp-servers/mcp-servers.module';
import { McpToolSnapshotManager } from '../mcp-servers/managers/mcp-tool-snapshot.manager';
import { CuratedCatalogController } from './controllers/curated-catalog.controller';
import { HostRulesAdminController } from './controllers/host-rules-admin.controller';
import { ServerApprovalController } from './controllers/server-approval.controller';
import { AdminServerPresenterManager } from './managers/admin-server-presenter.manager';
import { CuratedManifestManager } from './managers/curated-manifest.manager';
import { CuratedPresenterManager } from './managers/curated-presenter.manager';
import { CuratedProbeManager } from './managers/curated-probe.manager';
import { SubmitterNoticeManager } from './managers/submitter-notice.manager';
import { AdminAuditRepository } from './repositories/admin-audit.repository';
import { CuratedCatalogRepository } from './repositories/curated-catalog.repository';
import { PendingServersRepository } from './repositories/pending-servers.repository';
import { AdminAuditService } from './services/admin-audit.service';
import { CuratedCatalogService } from './services/curated-catalog.service';
import { CuratedSeederService } from './services/curated-seeder.service';
import { HostRulesAdminService } from './services/host-rules-admin.service';
import { ServerApprovalService } from './services/server-approval.service';

/**
 * Admin management of the catalog (ADR-184): curated entries, the approval queue for users' own
 * servers, allow/deny rules, health checks, the audit log and the curated seed. Every route needs
 * PLUGINS_ADMIN. McpToolSnapshotManager has no dependencies, so it is provided here directly.
 */
@Module({
  imports: [McpServersModule, HostRulesModule],
  controllers: [CuratedCatalogController, ServerApprovalController, HostRulesAdminController],
  providers: [
    McpToolSnapshotManager,
    AdminAuditRepository,
    CuratedCatalogRepository,
    PendingServersRepository,
    CuratedManifestManager,
    CuratedProbeManager,
    CuratedPresenterManager,
    AdminServerPresenterManager,
    SubmitterNoticeManager,
    AdminAuditService,
    CuratedCatalogService,
    ServerApprovalService,
    HostRulesAdminService,
    CuratedSeederService,
  ],
})
export class AdminCurationModule {}
