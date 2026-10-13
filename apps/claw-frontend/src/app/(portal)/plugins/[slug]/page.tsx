'use client';

import { useParams } from 'next/navigation';

import { PluginDetailPage } from '@/components/plugins/plugin-detail-page';
import { decodePathSegment } from '@/utilities/observability-url.utility';

export default function PluginDetailRoutePage() {
  const params = useParams<{ slug: string }>();
  return <PluginDetailPage slug={decodePathSegment(params.slug)} />;
}
