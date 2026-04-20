import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { DeviceService } from '../services/device.service';
import { RefreshService } from '../services/refresh.service';
import { type ListDevicesQueryDto, listDevicesQuerySchema } from '../dto/list-devices-query.dto';
import { type UpdateDeviceDto, updateDeviceSchema } from '../dto/update-device.dto';
import { type RevokeDeviceDto, revokeDeviceSchema } from '../dto/revoke-device.dto';
import type { DevicePublic, DeviceWithCounts, PaginatedDevices } from '../types/agent.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/devices')
export class AgentDeviceController {
  constructor(
    private readonly service: DeviceService,
    private readonly refreshService: RefreshService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listDevicesQuerySchema)) query: ListDevicesQueryDto,
  ): Promise<PaginatedDevices> {
    return this.service.listForUser(user.id, query);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DeviceWithCounts> {
    return this.service.getForUser(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) dto: UpdateDeviceDto,
  ): Promise<DevicePublic> {
    return this.service.updateForUser(user.id, id, dto);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(revokeDeviceSchema)) dto: RevokeDeviceDto,
  ): Promise<DeviceWithCounts> {
    await this.refreshService.revokeDevice(user.id, id, dto.reason ?? null);
    return this.service.getForUser(user.id, id);
  }
}
