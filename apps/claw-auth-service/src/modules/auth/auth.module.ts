import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AuthController } from './controllers/auth.controller';
import { VscodeAuthorizationController } from './controllers/vscode-authorization.controller';
import { AuthService } from './services/auth.service';
import { VscodeAuthorizationService } from './services/vscode-authorization.service';
import { AuthManager } from './managers/auth.manager';
import { TokenSessionManager } from './managers/token-session.manager';
import { AuthRepository } from './repositories/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [RolesModule, PlansModule, RedisModule],
  controllers: [AuthController, VscodeAuthorizationController],
  providers: [
    AuthService,
    VscodeAuthorizationService,
    AuthManager,
    TokenSessionManager,
    AuthRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
