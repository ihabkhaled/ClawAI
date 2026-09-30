import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { issueRunnerToken } from '../../../common/utilities/runner-token.utility';
import { RunnerCredentialRepository } from '../repositories/runner-credential.repository';
import { RunnerRepository } from '../repositories/runner.repository';
import type { IssuedRunnerToken, RotatedRunnerCredential } from '../types/runner.types';

/**
 * F100 runner identity. Each runner holds its own token, issued once and
 * stored only as a digest. Owners rotate or revoke it with their user JWT;
 * a runner id that is not the caller's answers 404, never 403, so ids cannot
 * be probed.
 */
@Injectable()
export class RunnerCredentialService {
  private readonly logger = new Logger(RunnerCredentialService.name);

  constructor(
    private readonly credentials: RunnerCredentialRepository,
    private readonly runners: RunnerRepository,
  ) {}

  async issue(sessionId: string, userId: string): Promise<IssuedRunnerToken> {
    const issued = issueRunnerToken();
    await this.credentials.issue(sessionId, userId, issued.tokenHash, issued.tokenPrefix);
    return issued;
  }

  async rotate(runnerId: string, userId: string): Promise<RotatedRunnerCredential> {
    await this.assertOwned(runnerId, userId);
    const issued = issueRunnerToken();
    await this.credentials.rotate(runnerId, userId, issued.tokenHash, issued.tokenPrefix);
    this.logger.log(`runner ${runnerId} credential rotated`);
    return { runnerId, runnerToken: issued.token, tokenPrefix: issued.tokenPrefix };
  }

  /** Revokes the token and disconnects the runner, so no job is placed on it again. */
  async revoke(runnerId: string, userId: string): Promise<void> {
    await this.assertOwned(runnerId, userId);
    await this.credentials.revoke(runnerId);
    await this.runners.disconnect(runnerId);
    this.logger.log(`runner ${runnerId} revoked`);
  }

  private async assertOwned(runnerId: string, userId: string): Promise<void> {
    const runner = await this.runners.findOwned(runnerId, userId);
    if (runner === null) throw new EntityNotFoundException('Runner', runnerId);
  }
}
