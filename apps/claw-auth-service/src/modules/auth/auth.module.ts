import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthManager } from './managers/auth.manager';
import { TokenSessionManager } from './managers/token-session.manager';
import { AuthRepository } from './repositories/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [RolesModule, PlansModule],
  controllers: [AuthController],
  providers: [AuthService, AuthManager, TokenSessionManager, AuthRepository],
  exports: [AuthService],
})
export class AuthModule {}
