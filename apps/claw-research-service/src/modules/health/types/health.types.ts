import type { SidecarHealthReport } from '../../fetch/types/sidecar.types';
import type { ResearchHealthStatus } from '../enums/research-health-status.enum';

/**
 * research-service `GET /api/v1/health`. health-service reads `services.<key>`
 * (`crawl4ai`, `flaresolverr`, `firecrawl`: `up`/`down`/`disabled`) into rows
 * of their own — a contract test on each side pins this shape.
 */
export type ResearchHealthResponse = {
  status: ResearchHealthStatus;
  service: 'research-service';
  services: SidecarHealthReport;
};
