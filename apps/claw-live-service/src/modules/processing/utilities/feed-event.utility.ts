import type { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import type { LiveFeedEvent } from '../../../generated/prisma';
import type { LiveStreamEvent } from '../../realtime/types/live-stream-event.types';

/** The realtime message of one feed event row (cards, highlights, the final card, the report). */
export function feedEventMessage(type: LiveStreamEventType, row: LiveFeedEvent): LiveStreamEvent {
  return {
    type,
    runId: row.runId,
    startAt: Number(row.startAt),
    ...(row.endAt === null ? {} : { endAt: Number(row.endAt) }),
    data: {
      eventId: row.id,
      eventKey: row.eventKey,
      kind: row.kind,
      highlightType: row.highlightType,
      title: row.title,
      body: row.body,
      importance: row.importance,
      confidence: row.confidence,
      version: row.version,
      isOpen: row.isOpen,
    },
  };
}
