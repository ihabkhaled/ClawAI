'use client';

import { RouteErrorBoundary } from '@/components/common/route-error-boundary';
import type { RouteErrorBoundaryProps } from '@/types';

export default function SegmentError(props: RouteErrorBoundaryProps): React.ReactElement {
  return <RouteErrorBoundary {...props} />;
}
