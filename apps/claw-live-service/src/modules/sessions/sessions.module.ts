import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { ProcessingModule } from '../processing/processing.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SourcesModule } from '../sources/sources.module';
import { LiveCaptureController } from './controllers/live-capture.controller';
import { LiveSessionsController } from './controllers/live-sessions.controller';
import { LiveSourcesController } from './controllers/live-sources.controller';
import { LiveUsageController } from './controllers/live-usage.controller';
import { LiveCaptureManager } from './managers/live-capture.manager';
import { LiveCloseTokenManager } from './managers/live-close-token.manager';
import { LiveCoverageManager } from './managers/live-coverage.manager';
import { LiveHeartbeatManager } from './managers/live-heartbeat.manager';
import { LivePresenceManager } from './managers/live-presence.manager';
import { LiveSessionAdmissionManager } from './managers/live-session-admission.manager';
import { LiveSessionDetachManager } from './managers/live-session-detach.manager';
import { LiveSessionPresenterManager } from './managers/live-session-presenter.manager';
import { LiveSessionReaperManager } from './managers/live-session-reaper.manager';
import { LiveCaptureRepository } from './repositories/live-capture.repository';
import { LiveCoverageRepository } from './repositories/live-coverage.repository';
import { LiveSessionRepository } from './repositories/live-session.repository';
import { LiveCaptureService } from './services/live-capture.service';
import { LiveSessionsService } from './services/live-sessions.service';

/** Viewer sessions: create/attach, heartbeat accrual, coverage, approval, close, reaper, usage, browser-capture audio. */
@Module({
  imports: [SourcesModule, ProcessingModule, BillingModule, RealtimeModule],
  controllers: [
    LiveSourcesController,
    LiveSessionsController,
    LiveCaptureController,
    LiveUsageController,
  ],
  providers: [
    LiveSessionsService,
    LiveSessionRepository,
    LiveCoverageRepository,
    LivePresenceManager,
    LiveCoverageManager,
    LiveHeartbeatManager,
    LiveSessionAdmissionManager,
    LiveSessionDetachManager,
    LiveSessionPresenterManager,
    LiveCloseTokenManager,
    LiveSessionReaperManager,
    LiveCaptureService,
    LiveCaptureRepository,
    LiveCaptureManager,
  ],
  exports: [LiveSessionDetachManager],
})
export class SessionsModule {}
