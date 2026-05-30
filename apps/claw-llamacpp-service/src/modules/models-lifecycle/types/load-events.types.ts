/**
 * Plain-shape record returned by {@link LoadEventsRepository.findRecent}.
 * Pure data type — no Prisma return-type aliasing because consumers across
 * the service (probe report, frontend) need a stable JSON-serializable shape.
 */
export interface RecentLoadEvent {
  id: string;
  modelId: string;
  eventType: string;
  pid: number | null;
  port: number | null;
  errorMessage: string | null;
  occurredAt: Date;
}
