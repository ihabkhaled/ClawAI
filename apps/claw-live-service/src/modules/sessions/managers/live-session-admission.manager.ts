import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LiveErrorCode } from '../../../common/enums/live-error-code.enum';
import { LiveSourceKind } from '../../../generated/prisma';
import { RunCoordinatorService } from '../../processing/services/run-coordinator.service';
import type { ActiveLivePolicy } from '../../policy/types/live-policy.types';
import type { SourceResolution } from '../../sources/types/source-resolution.types';
import { LiveSessionRepository } from '../repositories/live-session.repository';
import { LivePresenceManager } from './live-presence.manager';

/** The gates a new analysable session passes, in order, before a run is attached. */
@Injectable()
export class LiveSessionAdmissionManager {
  constructor(
    private readonly sessions: LiveSessionRepository,
    private readonly presence: LivePresenceManager,
    private readonly coordinator: RunCoordinatorService,
  ) {}

  assertFeatureEnabled(policy: ActiveLivePolicy): void {
    if (!policy.config.featureEnabled) {
      throw new ServiceUnavailableException({
        message: 'Live Intelligence is not available',
        errorCode: LiveErrorCode.LIVE_DISABLED,
      });
    }
  }

  assertProcessingAllowed(policy: ActiveLivePolicy): void {
    if (policy.config.killSwitch) {
      throw new ServiceUnavailableException({
        message: 'Live analysis is paused',
        errorCode: LiveErrorCode.LIVE_DISABLED,
      });
    }
  }

  /** HLS needs the viewer's own rights attestation; FIXTURE is platform content. */
  assertAttestation(resolution: SourceResolution, attestRights: boolean): void {
    if (resolution.sourceKind === LiveSourceKind.HLS && !attestRights) {
      throw new UnprocessableEntityException({
        message: 'Confirm you have the right to analyse this stream',
        errorCode: LiveErrorCode.LIVE_RIGHTS_ATTESTATION_REQUIRED,
      });
    }
  }

  async assertLimits(userId: string, policy: ActiveLivePolicy): Promise<void> {
    const open = await this.sessions.countOpen(userId);
    if (open >= policy.config.maxSessionsPerUser) {
      throw new HttpException(
        { message: 'Too many live sessions open', errorCode: LiveErrorCode.LIVE_SESSION_LIMIT },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const started = await this.presence.countHourlyStart(userId, Date.now());
    if (started > policy.config.sessionsPerUserPerHour) {
      throw new HttpException(
        {
          message: 'Too many live sessions started this hour',
          errorCode: LiveErrorCode.LIVE_SESSION_RATE_LIMITED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertCapacity(): Promise<void> {
    const refusal = await this.coordinator.admissionRefusal();
    if (refusal !== null) {
      throw new ServiceUnavailableException({
        message: 'Live analysis is at capacity, try again shortly',
        errorCode: LiveErrorCode.CAPACITY,
        reason: refusal,
      });
    }
  }
}
