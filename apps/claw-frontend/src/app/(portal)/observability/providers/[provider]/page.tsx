'use client';

import { useParams } from 'next/navigation';

import { ProviderDetailPage } from '@/components/observability/pages/provider-detail-page';
import { decodePathSegment } from '@/utilities/observability-url.utility';

export default function ObservabilityProviderDetailPage() {
  const params = useParams<{ provider: string }>();
  return <ProviderDetailPage provider={decodePathSegment(params.provider)} />;
}
