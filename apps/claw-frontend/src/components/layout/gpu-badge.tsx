'use client';

import { Cpu, Zap } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants';
import { useGpuBadge } from '@/hooks/layout/use-gpu-badge';
import { useTranslation } from '@/lib/i18n';

export function GpuBadge(): React.ReactElement {
  const data = useGpuBadge();
  const { t } = useTranslation();

  if (!data.hasGpu) {
    return (
      <Link
        href={ROUTES.MODELS_LOCAL_FRONTIER}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
        title={t('gpuBadge.noGpu')}
      >
        <Cpu className="size-3" aria-hidden />
        <span>{t('gpuBadge.cpuOnly')}</span>
      </Link>
    );
  }

  const vendorLabel = t(`gpuBadge.vendor.${data.vendor}` as `gpuBadge.vendor.nvidia`);
  const summary = data.vramGb ? `${vendorLabel} · ${data.vramGb} GB` : vendorLabel;

  return (
    <Link
      href={ROUTES.MODELS_LOCAL_FRONTIER}
      className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
      title={data.model ?? vendorLabel}
    >
      <Zap className="size-3" aria-hidden />
      <span className="max-w-[140px] truncate">{summary}</span>
    </Link>
  );
}
