import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  // Roles and plans are imported for one reason each: an administrator-created
  // account must get the same roleRef and signup plan that self-registration
  // grants, instead of being born with neither. PlansRepository is used rather
  // than PlansService because PlansService now depends on UsersService for the
  // super-administrator target check, and the pair would form a cycle.
  imports: [AuthModule, RolesModule, PlansModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
