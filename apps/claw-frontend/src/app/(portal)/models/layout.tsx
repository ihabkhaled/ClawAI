'use client';

import { usePathname } from 'next/navigation';

import { ServiceAvailabilityBoundary } from '@/components/models/service-availability-boundary';
import type { ModelsAvailabilityLayoutProps } from '@/types';
import { requiredModelServiceForPath } from '@/utilities/service-availability.utility';

export default function ModelsAvailabilityLayout({
  children,
}: ModelsAvailabilityLayoutProps): React.ReactElement {
  const pathname = usePathname();
  return (
    <ServiceAvailabilityBoundary service={requiredModelServiceForPath(pathname)}>
      {children}
    </ServiceAvailabilityBoundary>
  );
}
