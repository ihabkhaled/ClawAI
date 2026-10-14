export type ZonedClock = {
  date: string;
  time: string;
  weekday: string;
  timeZone: string;
  /** +02:00 style offset from UTC. */
  offset: string;
  utc: string;
};
