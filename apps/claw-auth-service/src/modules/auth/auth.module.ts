import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AuthController } from './controllers/auth.controller';
import { VscodeAuthorizationController } from './controllers/vscode-authorization.controller';
import { AuthService } from './services/auth.service';
import { VscodeAuthorizationService } from './services/vscode-authorization.service';
import { AuthManager } from './managers/auth.manager';
import { TokenSessionManager } from './managers/token-session.manager';
import { AuthRepository } from './repositories/auth.repository';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetManager } from './managers/password-reset.manager';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';
import { EmailVerificationService } from './services/email-verification.service';
import { EmailVerificationRepository } from './repositories/email-verification.repository';
import { AuthEmailAdapter } from './adapters/auth-email.adapter';
import { EmailChangeManager } from './managers/email-change.manager';
import { EmailChangeRepository } from './repositories/email-change.repository';
import { EmailChangeService } from './services/email-change.service';

@Module({
  imports: [RolesModule, PlansModule, RedisModule],
  controllers: [AuthController, VscodeAuthorizationController],
  providers: [
    AuthService,
    VscodeAuthorizationService,
    AuthManager,
    TokenSessionManager,
    AuthRepository,
    PasswordResetService,
    PasswordResetManager,
    PasswordResetRepository,
    UsersRepository,
    EmailVerificationService,
    EmailVerificationRepository,
    AuthEmailAdapter,
    EmailChangeRepository,
    EmailChangeManager,
    EmailChangeService,
  ],
  exports: [AuthService, AuthEmailAdapter, EmailChangeService],
})
export class AuthModule {}
