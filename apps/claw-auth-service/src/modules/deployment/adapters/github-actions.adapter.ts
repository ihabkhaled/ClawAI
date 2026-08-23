import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DeploymentCredentialSource,
  type DeploymentRunJob,
  type DeploymentRunView,
} from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { decrypt } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  GITHUB_ACCEPT_HEADER,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  GITHUB_DEPLOY_WORKFLOW_FILE,
  GITHUB_DISPATCH_TIMEOUT_MS,
  GITHUB_MAX_JOBS,
  GITHUB_READ_TIMEOUT_MS,
  GITHUB_REF_PATTERN,
  GITHUB_REPOSITORY_PATTERN,
} from '../constants/deployment-trigger.constants';
import { githubJobListSchema, githubRunListSchema } from '../schemas/github-run.schema';
import { toDeploymentRunJob, toDeploymentRunView } from '../utilities/deployment-run.utility';
import { DeploymentCredentialRepository } from '../repositories/deployment-credential.repository';
import {
  type GithubDeployCredentials,
  type GithubDispatchRequest,
} from '../types/deployment-trigger.types';

/**
 * Dispatches the `deploy-production` workflow on GitHub Actions.
 *
 * This is the only place manual deployment touches GitHub. It deliberately does
 * nothing else: no run listing, no cancellation, no repository reads. A rollout
 * is driven end to end by the workflow and scripts/deploy-prod.sh exactly as an
 * automatic release drives it, so a manual deployment and an automatic one are
 * the same code path with a different starting gun.
 *
 * Credentials come from the admin deployment page when they have been
 * configured there, and from the GITHUB_DEPLOY_* environment otherwise. The
 * stored row wins because it is the one an operator can change without shell
 * access; the environment remains a working fallback so an existing box keeps
 * deploying and a fresh one can be provisioned from .env alone.
 *
 * The token never leaves this adapter and is never logged, including in the
 * error paths — a GitHub error surfaces as its status code alone.
 */
@Injectable()
export class GithubActionsAdapter {
  private readonly logger = new Logger(GithubActionsAdapter.name);

  constructor(private readonly credentials: DeploymentCredentialRepository) {}

  /**
   * The credentials manual deployment would use right now, or null when
   * neither source is whole. A partial set never half-enables the lane.
   */
  async resolve(): Promise<GithubDeployCredentials | null> {
    return (await this.resolveStored()) ?? this.resolveEnvironment();
  }

  async dispatch(request: GithubDispatchRequest): Promise<void> {
    const credentials = await this.resolve();
    if (!credentials) {
      throw new BusinessException(
        'Manual deployment is not configured',
        'DEPLOYMENT_TRIGGER_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${GITHUB_API_BASE_URL}/repos/${credentials.repository}/actions/workflows/${GITHUB_DEPLOY_WORKFLOW_FILE}/dispatches`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          accept: GITHUB_ACCEPT_HEADER,
          authorization: `Bearer ${credentials.token}`,
          'content-type': 'application/json',
          'x-github-api-version': GITHUB_API_VERSION,
        },
        body: JSON.stringify({
          ref: request.ref,
          inputs: {
            target_sha: request.targetSha ?? '',
            trigger_source: 'manual',
          },
        }),
        signal: AbortSignal.timeout(GITHUB_DISPATCH_TIMEOUT_MS),
      });
    } catch {
      // The message is intentionally generic: a fetch error can carry the
      // request URL, and the URL is built from the configured repository.
      throw new BusinessException(
        'GitHub could not be reached',
        'DEPLOYMENT_TRIGGER_UNREACHABLE',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok) {
      this.logger.error(`GitHub workflow dispatch rejected with HTTP ${response.status}.`);
      throw new BusinessException(
        `GitHub rejected the deployment dispatch (HTTP ${response.status})`,
        'DEPLOYMENT_TRIGGER_REJECTED',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * The most recent run of the deployment workflow, with its jobs and steps.
   *
   * Returns null rather than throwing when GitHub is unreachable or refuses
   * the read: this sits on the deployment page's polling path, and a transient
   * GitHub problem should degrade the progress panel, never break the page.
   */
  async latestRun(): Promise<DeploymentRunView | null> {
    const credentials = await this.resolve();
    if (!credentials) return null;

    const runs = await this.read(
      `${GITHUB_API_BASE_URL}/repos/${credentials.repository}/actions/workflows/${GITHUB_DEPLOY_WORKFLOW_FILE}/runs?per_page=1`,
      credentials.token,
      githubRunListSchema,
    );
    const run = runs?.workflow_runs[0];
    if (!run) return null;

    const jobs = await this.read(
      `${GITHUB_API_BASE_URL}/repos/${credentials.repository}/actions/runs/${String(run.id)}/jobs?per_page=${String(GITHUB_MAX_JOBS)}`,
      credentials.token,
      githubJobListSchema,
    );
    const mapped: DeploymentRunJob[] = (jobs?.jobs ?? []).map(toDeploymentRunJob);
    return toDeploymentRunView(run, mapped);
  }

  /** Actions tab for the deployment workflow of a given repository. */
  workflowUrl(repository: string): string {
    return `https://github.com/${repository}/actions/workflows/${GITHUB_DEPLOY_WORKFLOW_FILE}`;
  }

  /**
   * A stored row whose repository or ref no longer validates is treated as
   * unusable rather than silently ignored: the page reports it so an operator
   * can see why the lane is off, instead of the row appearing to be fine.
   */
  isUsableTarget(repository: string, ref: string): boolean {
    return GITHUB_REPOSITORY_PATTERN.test(repository) && GITHUB_REF_PATTERN.test(ref);
  }

  private async read<TSchema extends { parse: (value: unknown) => unknown }>(
    url: string,
    token: string,
    schema: TSchema & { safeParse: (value: unknown) => { success: boolean; data?: unknown } },
  ): Promise<ReturnType<TSchema['parse']> | null> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept: GITHUB_ACCEPT_HEADER,
          authorization: `Bearer ${token}`,
          'x-github-api-version': GITHUB_API_VERSION,
        },
        signal: AbortSignal.timeout(GITHUB_READ_TIMEOUT_MS),
      });
    } catch {
      this.logger.warn('GitHub Actions progress read could not reach GitHub.');
      return null;
    }
    if (!response.ok) {
      this.logger.warn(`GitHub Actions progress read returned HTTP ${response.status}.`);
      return null;
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      this.logger.warn('GitHub Actions progress read returned an unexpected shape.');
      return null;
    }
    return parsed.data as ReturnType<TSchema['parse']>;
  }

  private async resolveStored(): Promise<GithubDeployCredentials | null> {
    const stored = await this.credentials.find();
    if (!stored) return null;
    if (!this.isUsableTarget(stored.repository, stored.ref)) return null;
    let token: string;
    try {
      token = decrypt(stored.encryptedToken, AppConfig.get().ENCRYPTION_KEY);
    } catch {
      // A row that will not decrypt means ENCRYPTION_KEY was rotated without
      // re-saving the token. Report the lane as unconfigured rather than
      // failing at the moment an operator presses deploy.
      this.logger.error('Stored deployment token could not be decrypted; re-save it to recover.');
      return null;
    }
    if (token.trim().length === 0) return null;
    return {
      token,
      repository: stored.repository,
      ref: stored.ref,
      source: DeploymentCredentialSource.DATABASE,
      tokenLastFour: stored.tokenLastFour,
      updatedAt: stored.updatedAt.toISOString(),
    };
  }

  private resolveEnvironment(): GithubDeployCredentials | null {
    const config = AppConfig.get();
    const token = config.GITHUB_DEPLOY_TOKEN?.trim() ?? '';
    const repository = config.GITHUB_DEPLOY_REPOSITORY?.trim() ?? '';
    const ref = config.GITHUB_DEPLOY_REF?.trim() ?? '';
    if (token.length === 0 || repository.length === 0 || ref.length === 0) return null;
    if (!this.isUsableTarget(repository, ref)) return null;
    return {
      token,
      repository,
      ref,
      source: DeploymentCredentialSource.ENVIRONMENT,
      tokenLastFour: token.slice(-4),
      updatedAt: null,
    };
  }
}
