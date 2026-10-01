import { HttpException, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { AgentCommandService } from './agent-command.service';
import { CapabilityService } from './capability.service';
import type { DeviceContext } from '../../../common/types/auth.types';
import type { CancelCapabilityDto } from '../dto/cancel-capability.dto';
import type { CancelCommandDto } from '../dto/cancel-command.dto';
import type { ListCapabilitiesQueryDto } from '../dto/list-capabilities-query.dto';
import type { ListCommandsQueryDto } from '../dto/list-commands-query.dto';
import type { RejectCapabilityDto } from '../dto/reject-capability.dto';
import type { RejectCommandDto } from '../dto/reject-command.dto';
import type { PaginatedCommands } from '../types/agent.types';
import type { PaginatedCapabilities } from '../types/capability.types';
import type { CapabilityInvocation, TerminalCommand } from '../../../generated/prisma';
import type { MobileActionOutcome, MobileActionTarget } from '../types/agent-mobile.types';

/**
 * F097 — what a phone may do: read runs and pending approvals, approve or
 * deny one, cancel one. Every call runs as the OWNER of the device
 * (`device.userId`, taken from the verified token, never from the request), so
 * the ownership checks in the command and capability services are the same
 * ones the web UI gets: another user's id is a 403/404, not data.
 *
 * Nothing here creates, dispatches or executes anything. Every mutation is
 * audited, and so is every refusal of one.
 */
@Injectable()
export class AgentMobileService {
  private readonly logger = new Logger(AgentMobileService.name);

  constructor(
    private readonly commands: AgentCommandService,
    private readonly capabilities: CapabilityService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  listCommands(device: DeviceContext, query: ListCommandsQueryDto): Promise<PaginatedCommands> {
    return this.commands.listCommands(device.userId, query);
  }

  getCommand(device: DeviceContext, id: string): Promise<TerminalCommand> {
    return this.hideForeignCommand(id, this.commands.getCommand(id, device.userId));
  }

  approveCommand(device: DeviceContext, id: string): Promise<TerminalCommand> {
    return this.hideForeignCommand(
      id,
      this.audited(device, 'command.approve', { type: 'command', id }, () =>
        this.commands.approve(id, device.userId),
      ),
    );
  }

  rejectCommand(
    device: DeviceContext,
    id: string,
    dto: RejectCommandDto,
  ): Promise<TerminalCommand> {
    return this.hideForeignCommand(
      id,
      this.audited(device, 'command.reject', { type: 'command', id }, () =>
        this.commands.reject(id, device.userId, dto),
      ),
    );
  }

  cancelCommand(
    device: DeviceContext,
    id: string,
    dto: CancelCommandDto,
  ): Promise<TerminalCommand> {
    return this.hideForeignCommand(
      id,
      this.audited(device, 'command.cancel', { type: 'command', id }, () =>
        this.commands.cancel(id, device.userId, dto),
      ),
    );
  }

  listCapabilities(
    device: DeviceContext,
    query: ListCapabilitiesQueryDto,
  ): Promise<PaginatedCapabilities> {
    return this.capabilities.list(device.userId, query);
  }

  getCapability(device: DeviceContext, id: string): Promise<CapabilityInvocation> {
    return this.capabilities.getById(device.userId, id);
  }

  approveCapability(device: DeviceContext, id: string): Promise<CapabilityInvocation> {
    return this.audited(device, 'capability.approve', { type: 'capability', id }, () =>
      this.capabilities.approve(device.userId, id),
    );
  }

  rejectCapability(
    device: DeviceContext,
    id: string,
    dto: RejectCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.audited(device, 'capability.reject', { type: 'capability', id }, () =>
      this.capabilities.reject(device.userId, id, dto),
    );
  }

  cancelCapability(
    device: DeviceContext,
    id: string,
    dto: CancelCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.audited(device, 'capability.cancel', { type: 'capability', id }, () =>
      this.capabilities.cancel(device.userId, id, dto),
    );
  }

  /**
   * The command service answers 403 for someone else's id and 404 for a missing one. On this
   * surface both are 404 (rule 16 section 6), so an id cannot be probed for existence. The audit
   * entry is written before this, with the real reason.
   */
  private async hideForeignCommand<T>(id: string, call: Promise<T>): Promise<T> {
    try {
      return await call;
    } catch (error) {
      if (error instanceof BusinessException && error.code === 'FORBIDDEN') {
        throw new EntityNotFoundException('TerminalCommand', id);
      }
      throw error;
    }
  }

  private async audited<T>(
    device: DeviceContext,
    action: string,
    target: MobileActionTarget,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await run();
      void this.publish(device, action, target, 'success');
      return result;
    } catch (error) {
      void this.publish(device, action, target, 'denied', this.reasonOf(error));
      throw error;
    }
  }

  /** A status and, when the service gave one, its code. Never the message or the payload. */
  private reasonOf(error: unknown): string {
    if (error instanceof HttpException) {
      const body = error.getResponse();
      const code =
        typeof body === 'object' && 'code' in body && typeof body.code === 'string'
          ? body.code
          : undefined;
      return code ?? `http_${String(error.getStatus())}`;
    }
    return 'error';
  }

  private async publish(
    device: DeviceContext,
    action: string,
    target: MobileActionTarget,
    outcome: MobileActionOutcome,
    reason?: string,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(EventPattern.AGENT_MOBILE_ACTION, {
        deviceId: device.deviceId,
        userId: device.userId,
        action,
        targetType: target.type,
        targetId: target.id,
        outcome,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${EventPattern.AGENT_MOBILE_ACTION}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
