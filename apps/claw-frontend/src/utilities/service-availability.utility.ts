import type { SidebarItem } from '@/constants';
import { MODEL_LOCAL_FRONTIER_PATH_PREFIX } from '@/constants/service-availability.constants';
import { OptionalService, ServiceStatus } from '@/enums';
import type { AggregatedHealth } from '@/types';

export function readServiceAvailability(
  health: AggregatedHealth | undefined,
  service: OptionalService,
): boolean {
  return (
    health?.services.find((candidate) => candidate.name === service)?.status === ServiceStatus.UP
  );
}

export function applyServiceAvailability(
  items: SidebarItem[],
  health: AggregatedHealth | undefined,
): SidebarItem[] {
  return items.map((item) => ({
    ...item,
    ...(item.requiredService === undefined
      ? {}
      : { disabled: !readServiceAvailability(health, item.requiredService) }),
    ...(item.children === undefined
      ? {}
      : { children: applyServiceAvailability(item.children, health) }),
  }));
}

export function requiredModelServiceForPath(pathname: string): OptionalService {
  return pathname === MODEL_LOCAL_FRONTIER_PATH_PREFIX ||
    pathname.startsWith(`${MODEL_LOCAL_FRONTIER_PATH_PREFIX}/`)
    ? OptionalService.LLAMACPP
    : OptionalService.OLLAMA;
}
