/**
 * What research-service `/health` reports for one scraping sidecar
 * (`services.<key>`). health-service reads these exact strings: `up` and
 * `down` become a row, `disabled` becomes a DISABLED status-page row that is
 * never counted as an outage.
 */
export enum SidecarHealthState {
  UP = 'up',
  DOWN = 'down',
  DISABLED = 'disabled',
}
