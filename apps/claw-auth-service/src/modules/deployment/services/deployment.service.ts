import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type DeploymentAutomationDocument,
  type DeploymentResetResult,
  DeploymentState,
  type DeploymentStatusDocument,
  type DeploymentStatusView,
  DeploymentTriggerMode,
  type DeploymentTriggerResult,
} from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { UsersService } from '../../users/services/users.service';
import { DeploymentStatusFileAdapter } from '../adapters/deployment-status-file.adapter';
import { GithubActionsAdapter } from '../adapters/github-actions.adapter';
import { DEPLOYMENT_STATUS_STALE_MS } from '../constants/deployment-status.constants';
import {
  type SetDeploymentAutomationDto,
  type TriggerDeploymentDto,
} from '../dto/deployment-trigger.dto';
import { type DeploymentNotificationResult } from '../types/deployment-notification.types';
import { type DeploymentViewFlags } from '../types/deployment-view.types';
import {
  toDeploymentStatusView,
  toResetDeploymentStatus,
  unknownDeploymentStatusView,
} from '../utilities/deployment-status.utility';

@Injectable()
export class DeploymentService {
  constructor(
    private readonly usersService: UsersService,
    private readonly statusFile: DeploymentStatusFileAdapter,
    private readonly emailAdapter: AuthEmailAdapter,
    private readonly githubActions: GithubActionsAdapter,
  ) {}

  async getStatus(actorId: string): Promise<DeploymentStatusView> {
    await this.usersService.assertSuperAdminActor(actorId);
    const [status, flags] = await Promise.all([this.statusFile.read(), this.resolveFlags()]);
    return status ? toDeploymentStatusView(status, flags) : unknownDeploymentStatusView(flags);
  }

  /**
   * Starts a production rollout by dispatching the same workflow a green
   * release dispatches automatically. A rollout that is still reporting blocks
   * the dispatch: GitHub would queue the second run behind the first anyway,
   * and an operator pressing deploy twice deserves an error rather than a
   * silent wait. A rollout that has gone quiet past the stale window does not
   * block — that is exactly the stuck case this exists to recover.
   */
  async trigger(actorId: string, dto: TriggerDeploymentDto): Promise<DeploymentTriggerResult> {
    await this.usersService.assertSuperAdminActor(actorId);
    const ref = this.githubActions.defaultRef();
    const workflowUrl = this.githubActions.workflowUrl();
    if (ref === null || workflowUrl === null) {
      throw new BusinessException(
        'Manual deployment is not configured',
        'DEPLOYMENT_TRIGGER_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const status = await this.statusFile.read();
    this.assertNoLiveRollout(status);
    const targetSha = this.resolveTargetSha(dto, status);
    await this.githubActions.dispatch({ ref, targetSha });
    return { dispatched: true, mode: dto.mode, targetSha, ref, workflowUrl };
  }

  /**
   * Clears a rollout that stopped reporting so the page and the next dispatch
   * are no longer blocked behind it. It only rewrites the status file — it does
   * not stop a workflow, roll anything back, or touch the deployed SHA. If the
   * rollout is in fact alive it will overwrite this record on its next phase.
   */
  async reset(actorId: string): Promise<DeploymentResetResult> {
    await this.usersService.assertSuperAdminActor(actorId);
    const status = await this.statusFile.read();
    if (status?.state !== DeploymentState.RUNNING) {
      return { reset: false, clearedSha: null };
    }
    await this.statusFile.write(toResetDeploymentStatus(status, new Date().toISOString()));
    return { reset: true, clearedSha: status.targetSha };
  }

  /**
   * Pauses or resumes the automatic lane. scripts/deploy-prod.sh reads the same
   * switch and refuses an automatic rollout while it is off; a manual dispatch
   * ignores it, so pausing never locks an operator out of production.
   */
  async setAutomation(
    actorId: string,
    dto: SetDeploymentAutomationDto,
  ): Promise<DeploymentViewFlags> {
    await this.usersService.assertSuperAdminActor(actorId);
    const document: DeploymentAutomationDocument = {
      schemaVersion: 1,
      enabled: dto.enabled,
      updatedAt: new Date().toISOString(),
    };
    await this.statusFile.writeAutomation(document);
    return {
      manualTriggerEnabled: this.githubActions.isEnabled(),
      automaticDeployEnabled: dto.enabled,
    };
  }

  async sendNotification(): Promise<DeploymentNotificationResult> {
    const status = await this.statusFile.read();
    if (!status || status.state === DeploymentState.RUNNING) return { sent: false };
    return { sent: await this.emailAdapter.sendDeploymentNotification(status) };
  }

  private async resolveFlags(): Promise<DeploymentViewFlags> {
    const automation = await this.statusFile.readAutomation();
    return {
      manualTriggerEnabled: this.githubActions.isEnabled(),
      // No file means nobody ever paused the lane, which is the shipped
      // default: a green release deploys itself.
      automaticDeployEnabled: automation?.enabled ?? true,
    };
  }

  private assertNoLiveRollout(status: DeploymentStatusDocument | null): void {
    if (status?.state !== DeploymentState.RUNNING) return;
    if (Date.now() - Date.parse(status.updatedAt) > DEPLOYMENT_STATUS_STALE_MS) return;
    throw new BusinessException(
      'A deployment is already running',
      'DEPLOYMENT_ALREADY_RUNNING',
      HttpStatus.CONFLICT,
    );
  }

  private resolveTargetSha(
    dto: TriggerDeploymentDto,
    status: DeploymentStatusDocument | null,
  ): string | null {
    if (dto.mode === DeploymentTriggerMode.SHA) return dto.targetSha ?? null;
    if (dto.mode === DeploymentTriggerMode.LATEST) return null;
    const deployedSha = status?.deployedSha ?? null;
    if (deployedSha === null) {
      throw new BusinessException(
        'No deployed commit is recorded to re-deploy',
        'DEPLOYMENT_NO_DEPLOYED_SHA',
        HttpStatus.CONFLICT,
      );
    }
    return deployedSha;
  }
}
