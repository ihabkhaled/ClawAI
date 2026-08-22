import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import {
  GITHUB_ACCEPT_HEADER,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  GITHUB_DEPLOY_WORKFLOW_FILE,
  GITHUB_DISPATCH_TIMEOUT_MS,
  GITHUB_REF_PATTERN,
  GITHUB_REPOSITORY_PATTERN,
} from '../constants/deployment-trigger.constants';
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
 * The token never leaves this adapter and is never logged, including in the
 * error paths — a GitHub error surfaces as its status code alone.
 */
@Injectable()
export class GithubActionsAdapter {
  private readonly logger = new Logger(GithubActionsAdapter.name);

  /**
   * True only when every credential is present AND well formed. A blank value
   * in .env is unset, not empty-string, so a half-configured box reports the
   * manual lane as unavailable rather than failing at the moment an operator
   * presses deploy.
   */
  isEnabled(): boolean {
    return this.resolveCredentials() !== null;
  }

  /** Default git ref a manual dispatch targets, or null when unconfigured. */
  defaultRef(): string | null {
    return this.resolveCredentials()?.ref ?? null;
  }

  /** Actions tab for the deployment workflow, or null when unconfigured. */
  workflowUrl(): string | null {
    const credentials = this.resolveCredentials();
    if (!credentials) return null;
    return `https://github.com/${credentials.repository}/actions/workflows/${GITHUB_DEPLOY_WORKFLOW_FILE}`;
  }

  async dispatch(request: GithubDispatchRequest): Promise<void> {
    const credentials = this.resolveCredentials();
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

  private resolveCredentials(): GithubDeployCredentials | null {
    const config = AppConfig.get();
    const token = config.GITHUB_DEPLOY_TOKEN?.trim() ?? '';
    const repository = config.GITHUB_DEPLOY_REPOSITORY?.trim() ?? '';
    const ref = config.GITHUB_DEPLOY_REF?.trim() ?? '';
    if (token.length === 0 || repository.length === 0 || ref.length === 0) return null;
    if (!GITHUB_REPOSITORY_PATTERN.test(repository) || !GITHUB_REF_PATTERN.test(ref)) return null;
    return { token, repository, ref };
  }
}
