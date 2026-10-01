import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import { MobileDeviceScope } from '@claw/shared-types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { DeviceAccessGuard } from '../../../common/guards/device-access.guard';
import { ScopeGuard } from '../../../common/guards/scope.guard';
import { CurrentDevice } from '../../../common/decorators/current-device.decorator';
import { MobileRoute } from '../../../common/decorators/mobile-route.decorator';
import { RequireScopes } from '../../../common/decorators/require-scopes.decorator';
import { AgentMobileService } from '../services/agent-mobile.service';
import { type CancelCapabilityDto, cancelCapabilitySchema } from '../dto/cancel-capability.dto';
import { type CancelCommandDto, cancelCommandSchema } from '../dto/cancel-command.dto';
import {
  type ListCapabilitiesQueryDto,
  listCapabilitiesQuerySchema,
} from '../dto/list-capabilities-query.dto';
import { type ListCommandsQueryDto, listCommandsQuerySchema } from '../dto/list-commands-query.dto';
import { type RejectCapabilityDto, rejectCapabilitySchema } from '../dto/reject-capability.dto';
import { type RejectCommandDto, rejectCommandSchema } from '../dto/reject-command.dto';
import type { PaginatedCommands } from '../types/agent.types';
import type { PaginatedCapabilities } from '../types/capability.types';
import type { CapabilityInvocation, TerminalCommand } from '../../../generated/prisma';
import type { DeviceContext } from '../../../common/types/auth.types';

/**
 * F097 — the ENTIRE surface a mobile token can reach. `@Public()` only lifts
 * the user-JWT guard; `DeviceAccessGuard` then admits a mobile device token
 * and nothing else, and `ScopeGuard` enforces the scope each handler names.
 * `@MobileRoute()` is what makes a route reachable by a phone: it is on this
 * class and on no other.
 *
 * "Runs" are terminal commands, "approvals" are capability invocations.
 * Handlers only extract and delegate; the owner scoping lives in the service.
 */
@Controller('agent/mobile')
@Public()
@MobileRoute()
@UseGuards(DeviceAccessGuard, ScopeGuard)
export class AgentMobileController {
  constructor(private readonly service: AgentMobileService) {}

  @Get('commands')
  @RequireScopes(MobileDeviceScope.RUNS_READ)
  listCommands(
    @CurrentDevice() device: DeviceContext,
    @Query(new ZodValidationPipe(listCommandsQuerySchema)) query: ListCommandsQueryDto,
  ): Promise<PaginatedCommands> {
    return this.service.listCommands(device, query);
  }

  @Get('commands/:id')
  @RequireScopes(MobileDeviceScope.RUNS_READ)
  getCommand(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
  ): Promise<TerminalCommand> {
    return this.service.getCommand(device, id);
  }

  @Post('commands/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_APPROVE)
  approveCommand(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
  ): Promise<TerminalCommand> {
    return this.service.approveCommand(device, id);
  }

  @Post('commands/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_APPROVE)
  rejectCommand(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectCommandSchema)) dto: RejectCommandDto,
  ): Promise<TerminalCommand> {
    return this.service.rejectCommand(device, id, dto);
  }

  @Post('commands/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_CANCEL)
  cancelCommand(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelCommandSchema)) dto: CancelCommandDto,
  ): Promise<TerminalCommand> {
    return this.service.cancelCommand(device, id, dto);
  }

  @Get('capabilities')
  @RequireScopes(MobileDeviceScope.RUNS_READ)
  listCapabilities(
    @CurrentDevice() device: DeviceContext,
    @Query(new ZodValidationPipe(listCapabilitiesQuerySchema)) query: ListCapabilitiesQueryDto,
  ): Promise<PaginatedCapabilities> {
    return this.service.listCapabilities(device, query);
  }

  @Get('capabilities/:id')
  @RequireScopes(MobileDeviceScope.RUNS_READ)
  getCapability(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
  ): Promise<CapabilityInvocation> {
    return this.service.getCapability(device, id);
  }

  @Post('capabilities/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_APPROVE)
  approveCapability(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
  ): Promise<CapabilityInvocation> {
    return this.service.approveCapability(device, id);
  }

  @Post('capabilities/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_APPROVE)
  rejectCapability(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectCapabilitySchema)) dto: RejectCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.rejectCapability(device, id, dto);
  }

  @Post('capabilities/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireScopes(MobileDeviceScope.RUNS_CANCEL)
  cancelCapability(
    @CurrentDevice() device: DeviceContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelCapabilitySchema)) dto: CancelCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.cancelCapability(device, id, dto);
  }
}
