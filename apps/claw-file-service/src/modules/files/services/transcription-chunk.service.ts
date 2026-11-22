import { Injectable } from '@nestjs/common';
import { type TranscribeChunkDto } from '../dto/transcribe-chunk.dto';
import { TranscriptionChunkManager } from '../managers/transcription-chunk.manager';
import { type TranscribeChunkResult } from '../types/transcribe-chunk.types';

/**
 * `POST /internal/files/transcribe-chunk` (ADR-221): a Live Intelligence audio
 * chunk read as text at the platform's cost. Service-token only; there is no
 * user, so there is no wallet and nothing to authorize beyond the caller.
 */
@Injectable()
export class TranscriptionChunkService {
  constructor(private readonly manager: TranscriptionChunkManager) {}

  async transcribeChunk(dto: TranscribeChunkDto): Promise<TranscribeChunkResult> {
    return this.manager.transcribe(dto);
  }
}
