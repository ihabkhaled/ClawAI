import { Injectable, Logger } from '@nestjs/common';
import { HardwareDetectorManager } from '../managers/hardware-detector.manager';
import { type HardwareSnapshot } from '../types/hardware.types';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  constructor(private readonly detector: HardwareDetectorManager) {}

  getCurrent(): Promise<HardwareSnapshot> {
    this.logger.debug('getCurrent: returning cached or fresh snapshot');
    return this.detector.snapshot(false);
  }

  refresh(): Promise<HardwareSnapshot> {
    this.logger.log('refresh: forcing hardware detection');
    return this.detector.snapshot(true);
  }
}
