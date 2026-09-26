import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { UsersService } from '../services/users.service';
import { type UserSpeechPreferences } from '../types/users.types';

// Service-to-service reads of a user's preferences. @Public for the JWT guard,
// then ServiceTokenGuard requires INTER_SERVICE_AUTH_TOKEN (TD-035). nginx
// does not proxy /api/v1/internal/*.
@Controller('internal/users')
@Public()
@UseGuards(ServiceTokenGuard)
export class UsersInternalController {
  constructor(private readonly usersService: UsersService) {}

  /** chat-service's "Read aloud": which voice the user picked (null = defaults). */
  @Get(':id/speech-preferences')
  async getSpeechPreferences(@Param('id') id: string): Promise<UserSpeechPreferences> {
    return this.usersService.getSpeechPreferences(id);
  }
}
