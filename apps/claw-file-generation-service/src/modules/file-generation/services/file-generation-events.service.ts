import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { type FileGenerationEventPayload } from '../types/file-generation.types';

@Injectable()
export class FileGenerationEventsService {
  private readonly logger = new Logger(FileGenerationEventsService.name);
  private readonly stream$ = new Subject<FileGenerationEventPayload>();

  publish(payload: FileGenerationEventPayload): void {
    this.stream$.next(payload);
    this.logger.debug(`SSE event: generationId=${payload.generationId} status=${payload.status}`);
  }

  subscribe(generationId: string): Observable<MessageEvent> {
    return this.stream$.pipe(
      filter((event) => event.generationId === generationId),
      map((event): MessageEvent => ({ data: JSON.stringify(event) }) as MessageEvent),
    );
  }
}
