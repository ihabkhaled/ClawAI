import { Injectable } from '@nestjs/common';
import { DeploymentState, type DeploymentStatusView } from '@claw/shared-types';

import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { UsersService } from '../../users/services/users.service';
import { DeploymentStatusFileAdapter } from '../adapters/deployment-status-file.adapter';
import { type DeploymentNotificationResult } from '../types/deployment-notification.types';
import {
  toDeploymentStatusView,
  unknownDeploymentStatusView,
} from '../utilities/deployment-status.utility';

@Injectable()
export class DeploymentService {
  constructor(
    private readonly usersService: UsersService,
    private readonly statusFile: DeploymentStatusFileAdapter,
    private readonly emailAdapter: AuthEmailAdapter,
  ) {}

  async getStatus(actorId: string): Promise<DeploymentStatusView> {
    await this.usersService.assertSuperAdminActor(actorId);
    const status = await this.statusFile.read();
    return status ? toDeploymentStatusView(status) : unknownDeploymentStatusView();
  }

  async sendNotification(): Promise<DeploymentNotificationResult> {
    const status = await this.statusFile.read();
    if (!status || status.state === DeploymentState.RUNNING) return { sent: false };
    return { sent: await this.emailAdapter.sendDeploymentNotification(status) };
  }
}
