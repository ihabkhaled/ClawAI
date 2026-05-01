export interface SseEvent<T> {
  event: string;
  data: T;
}
