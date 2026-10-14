import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type PublicProfilesBodyDto, publicProfilesBodySchema } from '../dto/public-profiles.dto';
import { UsersService } from '../services/users.service';
import {
  type PublicProfile,
  type UserIdentity,
  type UserSpeechPreferences,
} from '../types/users.types';

// Service-to-service reads of a user's preferences. @Public for the JWT guard,
// then ServiceTokenGuard requires INTER_SERVICE_AUTH_TOKEN (TD-035). nginx
// does not proxy /api/v1/internal/*.
@Controller('internal/users')
@Public()
@UseGuards(ServiceTokenGuard)
export class UsersInternalController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * threads-service names comment authors and thread owners: id -> username + displayName.
   * Unknown or non-active ids are left out. Declared before `:id/...` routes so no id shadows it.
   */
  @Post('public-profiles')
  @HttpCode(200)
  async getPublicProfiles(
    @Body(new ZodValidationPipe(publicProfilesBodySchema)) body: PublicProfilesBodyDto,
  ): Promise<PublicProfile[]> {
    return this.usersService.getPublicProfiles(body.ids);
  }

  /** threads-service resolves an @mention (case-insensitive, active accounts only). 404 otherwise. */
  @Get('by-username/:username')
  async getPublicProfileByUsername(@Param('username') username: string): Promise<PublicProfile> {
    return this.usersService.getPublicProfileByUsername(username);
  }

  /** chat-service's "Read aloud": which voice the user picked (null = defaults). */
  @Get(':id/speech-preferences')
  async getSpeechPreferences(@Param('id') id: string): Promise<UserSpeechPreferences> {
    return this.usersService.getSpeechPreferences(id);
  }

  /** audit-service's feedback tickets: the author's name, snapshotted at submit time. */
  @Get(':id/identity')
  async getIdentity(@Param('id') id: string): Promise<UserIdentity> {
    return this.usersService.getIdentity(id);
  }
}
