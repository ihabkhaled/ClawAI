/** The windows the status page reports uptime over. 30 d is the TSDB retention (ADR-113). */
export enum UptimeWindow {
  DAY = '24h',
  WEEK = '7d',
  MONTH = '30d',
}
