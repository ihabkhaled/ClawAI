import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DeploymentCredentialSource,
  type DeploymentRunJob,
  DeploymentRunLane,
  type DeploymentRunView,
} from '@claw/shared-types';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

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
  GITHUB_MAX_RUN_PROBES,
  GITHUB_READ_TIMEOUT_MS,
  GITHUB_REF_PATTERN,
  GITHUB_RELEASE_WORKFLOW_FILE,
  GITHUB_REPOSITORY_PATTERN,
  GITHUB_RUN_CANDIDATES_PER_LANE,
} from '../constants/deployment-trigger.constants';
import { githubJobListSchema, githubRunListSchema } from '../schemas/github-run.schema';
import {
  rankRunCandidates,
  selectDeployJobs,
  toDeploymentRunJob,
  toDeploymentRunView,
} from '../utilities/deployment-run.utility';
import { DeploymentCredentialRepository } from '../repositories/deployment-credential.repository';
import {
  type GithubDeployCredentials,
  type GithubDispatchRequest,
} from '../types/deployment-trigger.types';
import { type GithubRunCandidate } from '../types/github-run.types';

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
      response = await fetch(this.githubUrl(url), {
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
        redirect: 'error',
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
   * The rollout an operator cares about right now, with its jobs and steps.
   *
   * Production is deployed by two lanes: a manual dispatch of
   * deploy-production.yml, and the automatic lane, where release.yml calls that
   * workflow as a reusable job. The automatic runs never appear in
   * deploy-production.yml's own run list, so reading only that list pinned the
   * panel to the last MANUAL run forever. Both lanes are read; a queued or
   * running rollout wins, otherwise the newest. Release runs that deployed
   * nothing are passed over, within a bounded number of job reads.
   *
   * Returns null rather than throwing when GitHub is unreachable or refuses
   * the read: this sits on the deployment page's polling path, and a transient
   * GitHub problem should degrade the progress panel, never break the page.
   */
  async latestRun(): Promise<DeploymentRunView | null> {
    const credentials = await this.resolve();
    if (!credentials) return null;

    const [manual, automatic] = await Promise.all([
      this.readLane(credentials, GITHUB_DEPLOY_WORKFLOW_FILE, DeploymentRunLane.MANUAL),
      this.readLane(credentials, GITHUB_RELEASE_WORKFLOW_FILE, DeploymentRunLane.AUTO),
    ]);
    const candidates = rankRunCandidates([...manual, ...automatic]).slice(0, GITHUB_MAX_RUN_PROBES);

    for (const candidate of candidates) {
      const jobs = await this.read(
        `${GITHUB_API_BASE_URL}/repos/${credentials.repository}/actions/runs/${String(candidate.run.id)}/jobs?per_page=${String(GITHUB_MAX_JOBS)}`,
        credentials.token,
        githubJobListSchema,
      );
      // A failed read of the best candidate is reported as unreachable rather
      // than quietly showing an older run in its place.
      if (!jobs) return null;
      const deployJobs = selectDeployJobs(candidate, jobs.jobs);
      if (!deployJobs) continue;
      const mapped: DeploymentRunJob[] = deployJobs.map(toDeploymentRunJob);
      return toDeploymentRunView(candidate, mapped);
    }
    return null;
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

  /** Recent runs of one lane's workflow; an unreadable lane contributes none. */
  private async readLane(
    credentials: GithubDeployCredentials,
    workflowFile: string,
    lane: DeploymentRunLane,
  ): Promise<GithubRunCandidate[]> {
    const runs = await this.read(
      `${GITHUB_API_BASE_URL}/repos/${credentials.repository}/actions/workflows/${workflowFile}/runs?per_page=${String(GITHUB_RUN_CANDIDATES_PER_LANE)}`,
      credentials.token,
      githubRunListSchema,
    );
    return (runs?.workflow_runs ?? []).map((run) => ({ run, lane }));
  }

  private async read<TSchema extends { parse: (value: unknown) => unknown }>(
    url: string,
    token: string,
    schema: TSchema & { safeParse: (value: unknown) => { success: boolean; data?: unknown } },
  ): Promise<ReturnType<TSchema['parse']> | null> {
    let response: Response;
    try {
      response = await fetch(this.githubUrl(url), {
        headers: {
          accept: GITHUB_ACCEPT_HEADER,
          authorization: `Bearer ${token}`,
          'x-github-api-version': GITHUB_API_VERSION,
        },
        signal: AbortSignal.timeout(GITHUB_READ_TIMEOUT_MS),
        redirect: 'error',
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

  /**
   * Every GitHub call carries the deploy token, so its URL is checked before
   * it is sent (TD-040). The one declared host is GITHUB_API_BASE_URL's — a
   * literal in this service, never derived from the URL being fetched — so the
   * repository segment, which an operator types, cannot move the call off
   * api.github.com. Redirects are refused at the fetch: a 3xx would carry the
   * token to a destination nothing checked. A renamed repository therefore
   * fails instead of being followed; re-save the new name to recover.
   *
   * Called inside each fetch's try block, so a refusal degrades exactly like
   * an unreachable GitHub and never echoes the URL.
   */
  private githubUrl(url: string): URL {
    return assertSafeRequestUrl(url, declaredHost(GITHUB_API_BASE_URL));
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
    return token.trim().length === 0
      ? null
      : {
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
    return !this.isUsableTarget(repository, ref)
      ? null
      : {
          token,
          repository,
          ref,
          source: DeploymentCredentialSource.ENVIRONMENT,
          tokenLastFour: token.slice(-4),
          updatedAt: null,
        };
  }
}
