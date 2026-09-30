import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RunnerCredentialRepository } from '../../modules/agent/repositories/runner-credential.repository';
import { hashRunnerToken, looksLikeRunnerToken } from '../utilities/runner-token.utility';
import type { AgentRequest } from '../types/auth.types';

/**
 * F100: admits a runner by its own credential only. A user JWT, a device
 * token or an agent session key is refused here, so the claim and report
 * routes cannot be reached with anything but the token issued to that runner.
 * One answer for every failure, so a caller learns nothing about which part
 * was wrong.
 */
@Injectable()
export class RunnerTokenGuard implements CanActivate {
  constructor(private readonly credentials: RunnerCredentialRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!looksLikeRunnerToken(token)) throw this.refused();
    const identity = await this.credentials.findActiveByHash(hashRunnerToken(token));
    if (identity === null) throw this.refused();
    request.agentSession = { sessionId: identity.sessionId, userId: identity.userId };
    return true;
  }

  private refused(): UnauthorizedException {
    return new UnauthorizedException('Invalid or revoked runner credential');
  }
}
