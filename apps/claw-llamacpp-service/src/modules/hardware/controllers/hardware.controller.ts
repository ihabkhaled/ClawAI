import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { HardwareService } from '../services/hardware.service';
import { type HardwareSnapshot } from '../types/hardware.types';

@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get()
  getCurrent(): Promise<HardwareSnapshot> {
    return this.hardwareService.getCurrent();
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(): Promise<HardwareSnapshot> {
    return this.hardwareService.refresh();
  }
}
