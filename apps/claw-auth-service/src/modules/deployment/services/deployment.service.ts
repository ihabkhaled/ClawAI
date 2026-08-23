import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type DeploymentAutomationDocument,
  type DeploymentCredentialClearResult,
  DeploymentCredentialSource,
  type DeploymentCredentialView,
  type DeploymentResetResult,
  type DeploymentRunProgress,
  DeploymentRunUnavailableReason,
  DeploymentState,
  type DeploymentStatusDocument,
  type DeploymentStatusView,
  DeploymentTriggerMode,
  type DeploymentTriggerResult,
} from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { encrypt } from '../../../common/utilities';
import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { UsersService } from '../../users/services/users.service';
import { DeploymentStatusFileAdapter } from '../adapters/deployment-status-file.adapter';
import { GithubActionsAdapter } from '../adapters/github-actions.adapter';
import { DEPLOYMENT_STATUS_STALE_MS } from '../constants/deployment-status.constants';
import {
  DEPLOYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION,
  DEPLOYMENT_TOKEN_LAST_FOUR_LENGTH,
} from '../constants/deployment-trigger.constants';
import { type SaveDeploymentCredentialDto } from '../dto/deployment-credential.dto';
import {
  type SetDeploymentAutomationDto,
  type TriggerDeploymentDto,
} from '../dto/deployment-trigger.dto';
import { DeploymentCredentialRepository } from '../repositories/deployment-credential.repository';
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
    private readonly credentials: DeploymentCredentialRepository,
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
    const credentials = await this.githubActions.resolve();
    if (!credentials) {
      throw new BusinessException(
        'Manual deployment is not configured',
        'DEPLOYMENT_TRIGGER_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const status = await this.statusFile.read();
    this.assertNoLiveRollout(status);
    const targetSha = this.resolveTargetSha(dto, status);
    await this.githubActions.dispatch({ ref: credentials.ref, targetSha });
    return {
      dispatched: true,
      mode: dto.mode,
      targetSha,
      ref: credentials.ref,
      workflowUrl: this.githubActions.workflowUrl(credentials.repository),
    };
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
    return { ...(await this.resolveFlags()), automaticDeployEnabled: dto.enabled };
  }

  /**
   * Live progress of the latest production run, read straight from GitHub
   * Actions so the page shows the step that is actually executing rather than
   * inferring it. Never throws for a GitHub problem: the panel degrades with a
   * reason instead of taking the page down with it.
   */
  async getRunProgress(actorId: string): Promise<DeploymentRunProgress> {
    await this.usersService.assertSuperAdminActor(actorId);
    const credentials = await this.githubActions.resolve();
    if (!credentials) {
      return { available: false, reason: DeploymentRunUnavailableReason.NOT_CONFIGURED, run: null };
    }
    const run = await this.githubActions.latestRun();
    if (!run) {
      return { available: false, reason: DeploymentRunUnavailableReason.UNREACHABLE, run: null };
    }
    return { available: true, reason: null, run };
  }

  /**
   * Stores the credentials manual deployment uses, replacing the GITHUB_DEPLOY_*
   * environment fallback. The token is encrypted with ENCRYPTION_KEY before it
   * reaches the database and is never read back out to any caller.
   *
   * Omitting the token keeps the stored one, so an operator can correct a
   * repository or ref without re-pasting a secret they may no longer have.
   */
  async saveCredentials(
    actorId: string,
    dto: SaveDeploymentCredentialDto,
  ): Promise<DeploymentCredentialView> {
    await this.usersService.assertSuperAdminActor(actorId);
    const existing = await this.credentials.find();
    if (!dto.token && !existing) {
      throw new BusinessException(
        'A deployment token is required the first time credentials are saved',
        'DEPLOYMENT_TOKEN_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = dto.token?.trim();
    await this.credentials.upsert({
      repository: dto.repository,
      ref: dto.ref,
      encryptedToken: token
        ? encrypt(token, AppConfig.get().ENCRYPTION_KEY)
        : (existing?.encryptedToken ?? ''),
      tokenLastFour: token
        ? token.slice(-DEPLOYMENT_TOKEN_LAST_FOUR_LENGTH)
        : (existing?.tokenLastFour ?? ''),
      encryptionKeyVersion: DEPLOYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION,
      updatedByUserId: actorId,
    });
    return this.resolveCredentialView();
  }

  /**
   * Removes the stored credentials. The lane does not necessarily go dark:
   * if GITHUB_DEPLOY_* is set the service falls back to it, and the returned
   * source says which of the two is now in effect.
   */
  async clearCredentials(actorId: string): Promise<DeploymentCredentialClearResult> {
    await this.usersService.assertSuperAdminActor(actorId);
    const cleared = await this.credentials.delete();
    const view = await this.resolveCredentialView();
    return { cleared, source: view.source };
  }

  async sendNotification(): Promise<DeploymentNotificationResult> {
    const status = await this.statusFile.read();
    if (!status || status.state === DeploymentState.RUNNING) return { sent: false };
    return { sent: await this.emailAdapter.sendDeploymentNotification(status) };
  }

  private async resolveFlags(): Promise<DeploymentViewFlags> {
    const [automation, credentials] = await Promise.all([
      this.statusFile.readAutomation(),
      this.resolveCredentialView(),
    ]);
    return {
      // isUsable, not "a row exists": a stored row whose target no longer
      // validates or whose token will not decrypt cannot dispatch anything, and
      // offering the controls for it would be a button that can only fail.
      manualTriggerEnabled: credentials.isUsable,
      // No file means nobody ever paused the lane, which is the shipped
      // default: a green release deploys itself.
      automaticDeployEnabled: automation?.enabled ?? true,
      credentials,
    };
  }

  /**
   * What the page may know about the installed credentials. The token is never
   * part of this — only its last four characters, which identify it without
   * being usable.
   */
  private async resolveCredentialView(): Promise<DeploymentCredentialView> {
    const resolved = await this.githubActions.resolve();
    if (resolved) {
      return {
        source: resolved.source,
        repository: resolved.repository,
        ref: resolved.ref,
        tokenLastFour: resolved.tokenLastFour,
        updatedAt: resolved.updatedAt,
        isUsable: true,
      };
    }
    // Nothing usable resolved. A stored row may still exist — one whose
    // repository or ref no longer validates, or whose token will not decrypt.
    // Surfacing it as unusable explains why the lane is off; reporting NONE
    // would leave an operator staring at a form they already filled in.
    const stored = await this.credentials.find();
    if (stored) {
      return {
        source: DeploymentCredentialSource.DATABASE,
        repository: stored.repository,
        ref: stored.ref,
        tokenLastFour: stored.tokenLastFour,
        updatedAt: stored.updatedAt.toISOString(),
        isUsable: false,
      };
    }
    return {
      source: DeploymentCredentialSource.NONE,
      repository: null,
      ref: null,
      tokenLastFour: null,
      updatedAt: null,
      isUsable: false,
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
