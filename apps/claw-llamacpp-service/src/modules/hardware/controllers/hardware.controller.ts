import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { HardwareService } from '../services/hardware.service';
import { type HardwareSnapshot } from '../types/hardware.types';

@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get()
  getCurrent(): Promise<HardwareSnapshot> {
    return this.hardwareService.getCurrent();
  }

  // ADR-146 review: a refresh spawns nvidia-smi / rocm-smi / DRI probes, so it
  // needs the same permission as every other llama.cpp admin action.
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(): Promise<HardwareSnapshot> {
    return this.hardwareService.refresh();
  }
}
