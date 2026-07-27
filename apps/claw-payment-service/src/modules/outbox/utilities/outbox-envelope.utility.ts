export function addOutboxEventId(payload: unknown, eventId: string): Record<string, unknown> {
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    return { ...(payload as Record<string, unknown>), eventId };
  }
  return { eventId, data: payload };
}
