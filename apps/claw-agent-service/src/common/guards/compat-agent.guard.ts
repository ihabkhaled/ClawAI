import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AgentKeyGuard } from './agent-key.guard';
import { DeviceAccessGuard } from './device-access.guard';
import { AgentSessionRepository } from '../../modules/agent/repositories/agent-session.repository';
import { DEPRECATION_HEADER, LEGACY_SUNSET_DATE, SUNSET_HEADER } from '../constants/auth.constants';
import type { AgentRequest, AgentRequestWithContext } from '../types/auth.types';

@Injectable()
export class CompatAgentGuard implements CanActivate {
  constructor(
    private readonly deviceGuard: DeviceAccessGuard,
    private readonly legacyGuard: AgentKeyGuard,
    private readonly sessions: AgentSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let deviceOk: boolean;
    try {
      deviceOk = await this.deviceGuard.canActivate(context);
    } catch (primary) {
      return this.activateLegacy(context, primary);
    }
    // Outside the try: a device that names someone else's session must be
    // refused, not retried as a legacy key.
    if (deviceOk) await this.bridgeDeviceToSession(context);
    return deviceOk;
  }

  private async activateLegacy(context: ExecutionContext, primary: unknown): Promise<boolean> {
    try {
      const ok = await this.legacyGuard.canActivate(context);
      if (ok) {
        this.markDeprecated(context);
        const request = context.switchToHttp().getRequest<AgentRequest>();
        if (request.agentSession !== undefined) {
          request.agentSession.legacy = true;
        }
      }
      return ok;
    } catch {
      if (primary instanceof UnauthorizedException) throw primary;
      throw new UnauthorizedException('Invalid agent credentials');
    }
  }

  private async bridgeDeviceToSession(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const device = request.deviceContext;
    if (device === undefined) return;
    const sessionId = this.resolveSessionId(request as AgentRequestWithContext);
    if (sessionId === undefined) return;
    const session = await this.sessions.findById(sessionId);
    // One answer for "missing" and "not yours", so session ids cannot be probed.
    if (session?.userId !== device.userId) {
      throw new ForbiddenException('Session is not available to this device');
    }
    request.agentSession = {
      sessionId,
      userId: device.userId,
    };
  }

  private resolveSessionId(request: AgentRequestWithContext): string | undefined {
    const fromQuery = request.query?.['sessionId'];
    if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery;
    const bodyValue = request.body?.['sessionId'];
    if (typeof bodyValue === 'string' && bodyValue.length > 0) return bodyValue;
    const url = request.url ?? '';
    if (url.includes('/sessions/')) {
      const fromParams = request.params?.['id'];
      if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;
    }
    return undefined;
  }

  private markDeprecated(context: ExecutionContext): void {
    const response = context.switchToHttp().getResponse<{
      setHeader?: (name: string, value: string) => void;
    }>();
    if (typeof response.setHeader === 'function') {
      response.setHeader(DEPRECATION_HEADER, `true`);
      response.setHeader(SUNSET_HEADER, LEGACY_SUNSET_DATE);
    }
  }
}
