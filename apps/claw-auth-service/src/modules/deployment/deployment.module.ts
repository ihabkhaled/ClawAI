import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DeploymentStatusFileAdapter } from './adapters/deployment-status-file.adapter';
import { DeploymentAdminController } from './controllers/deployment-admin.controller';
import { DeploymentInternalController } from './controllers/deployment-internal.controller';
import { DeploymentService } from './services/deployment.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [DeploymentAdminController, DeploymentInternalController],
  providers: [DeploymentService, DeploymentStatusFileAdapter],
})
export class DeploymentModule {}
