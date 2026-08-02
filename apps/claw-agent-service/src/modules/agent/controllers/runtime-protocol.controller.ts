import { Controller, Get } from '@nestjs/common';

import { RuntimeProtocolService } from '../services/runtime-protocol.service';
import type { RuntimeProtocolDescriptor } from '../types/runtime-protocol.types';

@Controller('agent/runtime')
export class RuntimeProtocolController {
  constructor(private readonly service: RuntimeProtocolService) {}

  @Get('protocol')
  getProtocol(): RuntimeProtocolDescriptor {
    return this.service.getDescriptor();
  }
}
