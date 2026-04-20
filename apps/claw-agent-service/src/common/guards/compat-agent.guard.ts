import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AgentKeyGuard } from './agent-key.guard';
import { DeviceAccessGuard } from './device-access.guard';
import { DEPRECATION_HEADER, LEGACY_SUNSET_DATE, SUNSET_HEADER } from '../constants/auth.constants';
import type { AgentRequest, AgentRequestWithContext } from '../types/auth.types';

@Injectable()
export class CompatAgentGuard implements CanActivate {
  constructor(
    private readonly deviceGuard: DeviceAccessGuard,
    private readonly legacyGuard: AgentKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const ok = await this.deviceGuard.canActivate(context);
      if (ok) this.bridgeDeviceToSession(context);
      return ok;
    } catch (primary) {
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
  }

  private bridgeDeviceToSession(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const device = request.deviceContext;
    if (device === undefined) return;
    const sessionId = this.resolveSessionId(request as AgentRequestWithContext);
    if (sessionId === undefined) return;
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
