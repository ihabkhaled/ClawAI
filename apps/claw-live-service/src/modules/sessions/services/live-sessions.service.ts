import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { LiveErrorCode } from '../../../common/enums/live-error-code.enum';
import {
  LiveCapability,
  type LiveMode,
  LiveSessionState,
  LiveSourceKind,
  type LiveStream,
  type LiveViewerSession,
} from '../../../generated/prisma';
import { BillingService } from '../../billing/services/billing.service';
import { RunCoordinatorService } from '../../processing/services/run-coordinator.service';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import type { ActiveLivePolicy } from '../../policy/types/live-policy.types';
import { SourcesService } from '../../sources/services/sources.service';
import type { SourceResolution } from '../../sources/types/source-resolution.types';
import {
  LIVE_PLAYBACK_PATH_PREFIX,
  LIVE_PLAYBACK_PATH_SUFFIX,
} from '../constants/live-session.constants';
import type {
  ApproveCreditsBody,
  CreateSessionBody,
  HeartbeatBody,
  UpdateSessionBody,
} from '../dto/live-session.dto';
import { LiveCloseTokenManager } from '../managers/live-close-token.manager';
import { LiveHeartbeatManager } from '../managers/live-heartbeat.manager';
import { LivePresenceManager } from '../managers/live-presence.manager';
import { LiveSessionAdmissionManager } from '../managers/live-session-admission.manager';
import { LiveSessionDetachManager } from '../managers/live-session-detach.manager';
import { LiveSessionPresenterManager } from '../managers/live-session-presenter.manager';
import { LiveSessionRepository } from '../repositories/live-session.repository';
import type {
  LiveCloseView,
  LiveHeartbeatView,
  LiveSessionCreatedView,
  LiveSessionStateView,
  LiveSourceResolutionView,
} from '../types/live-session.types';
import { playbackPath, readBeaconToken } from '../utilities/live-beacon.utility';

/** Viewer sessions: start/attach, heartbeat, approval, language/mode change, close. */
@Injectable()
export class LiveSessionsService {
  constructor(
    private readonly policies: LivePolicyService,
    private readonly sources: SourcesService,
    private readonly coordinator: RunCoordinatorService,
    private readonly sessions: LiveSessionRepository,
    private readonly admission: LiveSessionAdmissionManager,
    private readonly heartbeats: LiveHeartbeatManager,
    private readonly presence: LivePresenceManager,
    private readonly detacher: LiveSessionDetachManager,
    private readonly closeTokens: LiveCloseTokenManager,
    private readonly presenter: LiveSessionPresenterManager,
    private readonly billing: BillingService,
  ) {}

  /** No DB write and no URL in the answer, so a PRIVATE url is never echoed anywhere. */
  async resolve(url: string, userId: string): Promise<LiveSourceResolutionView> {
    const resolution = await this.sources.resolve(url, userId);
    return {
      sourceKind: resolution.sourceKind,
      capability: resolution.capability,
      embedUrl: resolution.embedUrl,
      reasonCode: resolution.reasonCode,
    };
  }

  async create(userId: string, body: CreateSessionBody): Promise<LiveSessionCreatedView> {
    const policy = await this.policies.active();
    this.admission.assertFeatureEnabled(policy);
    const resolution = await this.sources.resolve(body.url, userId);
    if (resolution.capability === LiveCapability.PLAYER_ONLY) {
      const stream = await this.sources.upsertStream(resolution);
      const session = await this.sessions.create({
        userId,
        streamId: stream.id,
        language: body.language,
        mode: body.mode,
        state: LiveSessionState.UNSUPPORTED,
        policyVersion: policy.version,
      });
      return this.created(session, stream, resolution);
    }
    return this.createAnalysed(userId, body, policy, resolution);
  }

  async heartbeat(
    sessionId: string,
    userId: string,
    body: HeartbeatBody,
  ): Promise<LiveHeartbeatView> {
    return this.heartbeats.beat(await this.owned(sessionId, userId), body);
  }

  async approveCredits(
    sessionId: string,
    userId: string,
    body: ApproveCreditsBody,
  ): Promise<LiveSessionStateView> {
    const session = await this.owned(sessionId, userId);
    this.assertOpen(session);
    const resumable: LiveSessionState[] = [
      LiveSessionState.CREDITS_REQUIRED,
      LiveSessionState.EXHAUSTED,
    ];
    const cap = body.spendingCapMicroUsd === undefined ? null : BigInt(body.spendingCapMicroUsd);
    await this.sessions.approve(session.id, new Date(), cap, resumable.includes(session.state));
    return this.stateView(await this.owned(sessionId, userId));
  }

  async update(
    sessionId: string,
    userId: string,
    body: UpdateSessionBody,
  ): Promise<LiveSessionStateView> {
    const session = await this.owned(sessionId, userId);
    this.assertOpen(session);
    if (body.language !== undefined && body.language !== session.language) {
      await this.sessions.updateLanguage(session.id, body.language);
    }
    if (body.mode !== undefined && body.mode !== session.mode && session.runId !== null) {
      await this.switchRun(session, body.mode);
    }
    return this.stateView(await this.owned(sessionId, userId));
  }

  async close(sessionId: string, userId: string): Promise<LiveSessionStateView> {
    const session = await this.owned(sessionId, userId);
    await this.detacher.detach(session, 'CLOSED');
    return this.stateView(await this.owned(sessionId, userId));
  }

  /** navigator.sendBeacon close: no Bearer header, the signed close token proves ownership. */
  async closeWithToken(sessionId: string, request: Request): Promise<LiveCloseView> {
    const token = await readBeaconToken(request);
    const claims = token === null ? null : this.closeTokens.verify(token, sessionId);
    if (!claims) {
      throw new UnauthorizedException({
        message: 'Invalid close token',
        errorCode: LiveErrorCode.LIVE_CLOSE_TOKEN_INVALID,
      });
    }
    const session = await this.sessions.findOwned(sessionId, claims.userId);
    return !session ? { closed: false } : { closed: await this.detacher.detach(session, 'CLOSED') };
  }

  private async createAnalysed(
    userId: string,
    body: CreateSessionBody,
    policy: ActiveLivePolicy,
    resolution: SourceResolution,
  ): Promise<LiveSessionCreatedView> {
    this.admission.assertProcessingAllowed(policy);
    this.admission.assertAttestation(resolution, body.attestRights);
    await this.admission.assertLimits(userId, policy);
    await this.admission.assertCapacity();
    const stream = await this.sources.upsertStream(resolution);
    const { runId } = await this.coordinator.attach({ streamId: stream.id, mode: body.mode });
    const usage = await this.billing.usage(userId);
    const state =
      usage.freeSecondsUsed < usage.freeSecondsTotal
        ? LiveSessionState.ACTIVE
        : LiveSessionState.CREDITS_REQUIRED;
    const now = new Date();
    const session = await this.sessions.create({
      userId,
      streamId: stream.id,
      runId,
      language: body.language,
      mode: body.mode,
      state,
      rightsAttestedAt: body.attestRights ? now : null,
      policyVersion: policy.version,
      lastHeartbeatAt: now,
    });
    await this.presence.touch(runId, session.id, now.getTime());
    return this.created(session, stream, resolution);
  }

  /** Mode change = leave the old run (settling what it owes) and attach the run of the new mode. */
  private async switchRun(session: LiveViewerSession, mode: LiveMode): Promise<void> {
    const oldRunId = session.runId;
    if (oldRunId === null) return;
    await this.admission.assertCapacity();
    await this.detacher.settleRemainder(session.id);
    const { runId } = await this.coordinator.attach({ streamId: session.streamId, mode });
    await this.sessions.switchRun(session.id, mode, runId);
    await this.presence.remove(oldRunId, session.id);
    await this.presence.touch(runId, session.id, Date.now());
    await this.detacher.leaveRun(oldRunId);
  }

  private async created(
    session: LiveViewerSession,
    stream: LiveStream,
    resolution: SourceResolution,
  ): Promise<LiveSessionCreatedView> {
    const playable =
      stream.sourceKind === LiveSourceKind.HLS || stream.sourceKind === LiveSourceKind.FIXTURE;
    return {
      sessionId: session.id,
      runId: session.runId,
      streamId: stream.id,
      sourceKind: stream.sourceKind,
      capability: stream.capability,
      embedUrl: resolution.embedUrl,
      playbackUrl: playable
        ? playbackPath(LIVE_PLAYBACK_PATH_PREFIX, stream.id, LIVE_PLAYBACK_PATH_SUFFIX)
        : null,
      state: session.state,
      usage: await this.presenter.usage(session),
      closeToken: this.closeTokens.issue(session.id, session.userId),
    };
  }

  private async owned(sessionId: string, userId: string): Promise<LiveViewerSession> {
    const session = await this.sessions.findOwned(sessionId, userId);
    if (!session) {
      throw new NotFoundException({
        message: 'Live session not found',
        errorCode: LiveErrorCode.LIVE_SESSION_NOT_FOUND,
      });
    }
    return session;
  }

  private assertOpen(session: LiveViewerSession): void {
    const closed: LiveSessionState[] = [LiveSessionState.DETACHED, LiveSessionState.UNSUPPORTED];
    if (closed.includes(session.state)) {
      throw new NotFoundException({
        message: 'Live session is closed',
        errorCode: LiveErrorCode.LIVE_SESSION_CLOSED,
      });
    }
  }

  private stateView(session: LiveViewerSession): LiveSessionStateView {
    return {
      sessionId: session.id,
      state: session.state,
      language: session.language,
      runId: session.runId,
    };
  }
}
