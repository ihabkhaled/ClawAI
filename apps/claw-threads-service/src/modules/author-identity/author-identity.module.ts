import { Module } from '@nestjs/common';

import { AuthProfileClient } from './clients/auth-profile.client';
import { AuthorIdentityService } from './services/author-identity.service';

/** Names of authors and owners, asked of auth-service. Imported by every module that shows a person. */
@Module({
  providers: [AuthProfileClient, AuthorIdentityService],
  exports: [AuthorIdentityService],
})
export class AuthorIdentityModule {}
