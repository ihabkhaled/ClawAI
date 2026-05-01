import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentDevice } from '../../../common/decorators/current-device.decorator';
import { CompatAgentGuard } from '../../../common/guards/compat-agent.guard';
import {
  type CompleteCapabilityDto,
  completeCapabilitySchema,
} from '../dto/complete-capability.dto';
import { CapabilityService } from '../services/capability.service';
import type { DeviceContext } from '../../../common/types/auth.types';
import type { CapabilityInvocation } from '../../../generated/prisma';

/**
 * Stream 10 — CLI-side capability endpoints (CompatAgentGuard).
 * Mirrors the existing `/agent/commands/pending` + `/complete` pair
 * for the new generalised pipeline.
 */
@Controller('agent/cli-capabilities')
export class CapabilityCliController {
  constructor(private readonly service: CapabilityService) {}

  @Get('pending')
  @Public()
  @UseGuards(CompatAgentGuard)
  async getPending(
    @CurrentDevice() device: DeviceContext | undefined,
  ): Promise<CapabilityInvocation[]> {
    if (device === undefined) {
      return [];
    }
    const deviceId = device.deviceId;
    const pending = await this.service.getPendingForDevice(deviceId);
    const started = await Promise.all(
      pending.map((inv) => this.service.startExecutionByCli(inv.id, deviceId)),
    );
    return started.filter((c): c is CapabilityInvocation => c !== null);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(CompatAgentGuard)
  async complete(
    @CurrentDevice() device: DeviceContext | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completeCapabilitySchema)) dto: CompleteCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.completeByCli(id, device?.deviceId ?? '', dto);
  }
}
