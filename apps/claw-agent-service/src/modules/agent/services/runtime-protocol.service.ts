import { Injectable } from '@nestjs/common';

import { RUNTIME_PROTOCOL_DESCRIPTOR } from '../constants/runtime-protocol.constants';
import type { RuntimeProtocolDescriptor } from '../types/runtime-protocol.types';

@Injectable()
export class RuntimeProtocolService {
  getDescriptor(): RuntimeProtocolDescriptor {
    return RUNTIME_PROTOCOL_DESCRIPTOR;
  }
}
