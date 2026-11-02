import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type TranscribeTextDto } from '../dto/transcribe-text.dto';
import { TranscriptionReadManager } from '../managers/transcription-read.manager';
import { type TranscribeReadResult } from '../types/transcribe-read.types';

/**
 * `POST /files/transcribe-text`: audio or video read as text, billed to the
 * caller, nothing stored. The hold needs a user, so a request without one is a
 * 401 here even though the global guards already refuse it (defence in depth for
 * the one stateless route that spends money).
 */
@Injectable()
export class TranscriptionReadService {
  constructor(private readonly manager: TranscriptionReadManager) {}

  async transcribeText(
    userId: string | undefined,
    dto: TranscribeTextDto,
  ): Promise<TranscribeReadResult> {
    if (userId === undefined || userId.length === 0) {
      throw new UnauthorizedException('Sign in to read audio or video.');
    }
    return this.manager.read(userId, dto);
  }
}
