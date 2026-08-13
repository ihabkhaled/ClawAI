import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { DeploymentService } from '../services/deployment.service';
import { type DeploymentNotificationResult } from '../types/deployment-notification.types';

@Controller('internal/deployment')
@Public()
@UseGuards(ServiceTokenGuard)
export class DeploymentInternalController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  notify(): Promise<DeploymentNotificationResult> {
    return this.deploymentService.sendNotification();
  }
}
