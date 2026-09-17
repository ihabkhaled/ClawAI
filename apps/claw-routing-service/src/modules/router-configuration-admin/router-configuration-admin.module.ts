import { Module } from '@nestjs/common';
import { RouterConfigurationAdminController } from './controllers/router-configuration-admin.controller';
import { RouterConfigurationAdminService } from './services/router-configuration-admin.service';
import { RouterConfigurationRepository } from '../routing/repositories/router-configuration.repository';
import { ModelDeploymentRepository } from '../routing/repositories/model-deployment.repository';

// Deliberately its own module rather than folded into RoutingModule: the
// routing-engine hot path (RoutingManager, CloudRouterManager,
// RouterInferenceCoordinatorManager) is under active concurrent development
// in this same release, and this module's only shared dependency is
// RouterConfigurationRepository, which is stateless (backed by PrismaService)
// and safe to provide a second time here without colliding with the
// RoutingModule-scoped instance.
@Module({
  controllers: [RouterConfigurationAdminController],
  providers: [
    RouterConfigurationAdminService,
    RouterConfigurationRepository,
    ModelDeploymentRepository,
  ],
})
export class RouterConfigurationAdminModule {}
