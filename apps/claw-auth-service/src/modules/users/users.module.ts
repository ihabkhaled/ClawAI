import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';
import { AuthEmailAdapter } from '../auth/adapters/auth-email.adapter';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, AuthEmailAdapter],
  exports: [UsersService],
})
export class UsersModule {}
