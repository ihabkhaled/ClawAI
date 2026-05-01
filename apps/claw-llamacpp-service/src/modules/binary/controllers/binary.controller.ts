import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { BinaryService } from '../services/binary.service';
import { type BinaryStatus, type RuntimeInfo } from '../types/binary.types';

@Controller('runtime')
export class BinaryController {
  constructor(private readonly binaryService: BinaryService) {}

  @Get('info')
  getInfo(): Promise<RuntimeInfo> {
    return this.binaryService.getRuntimeInfo();
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('update')
  update(): Promise<BinaryStatus> {
    return this.binaryService.forceUpdate();
  }
}
